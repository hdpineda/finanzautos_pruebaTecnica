
#!/usr/bin/env python3
"""
kafka_cassandra_sim.py
- Consume mensajes GPS desde Kafka (o simularlos con --mock)
- Insertarlos/actualizarlos en Cassandra
- Verificar conteo y último registro por vehicleId

Requisitos (modo real):
  pip install kafka-python cassandra-driver

Uso (simulado, sin infra):
  python kafka_cassandra_sim.py --mock --limit 20 --vehicle-id 123ABC

Uso (real, con servicios locales):
  export KAFKA_BOOTSTRAP=localhost:9092
  export KAFKA_TOPIC=telemetry.gps.raw
  export KAFKA_GROUP=qa_e2e
  export CASSANDRA_HOSTS=localhost
  export CASSANDRA_KEYSPACE=techavl_tracking
  python kafka_cassandra_sim.py --limit 50 --vehicle-id 123ABC
"""
import os
import sys
import json
import time
import math
import argparse
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Iterable, Iterator, List, Dict, Any

# -------------------------
# Args y configuración
# -------------------------
def parse_args():
    p = argparse.ArgumentParser(description="Kafka -> Cassandra (o simulación)")
    p.add_argument("--bootstrap", default=os.getenv("KAFKA_BOOTSTRAP", "localhost:9092"))
    p.add_argument("--topic", default=os.getenv("KAFKA_TOPIC", "telemetry.gps.raw"))
    p.add_argument("--group", default=os.getenv("KAFKA_GROUP", "qa_e2e"))
    p.add_argument("--cassandra-hosts", default=os.getenv("CASSANDRA_HOSTS", "localhost"))
    p.add_argument("--keyspace", default=os.getenv("CASSANDRA_KEYSPACE", "techavl_tracking"))
    p.add_argument("--table", default=os.getenv("CASSANDRA_TABLE", "gps_points"))
    p.add_argument("--vehicle-id", default=os.getenv("VEHICLE_ID", "123ABC"))
    p.add_argument("--limit", type=int, default=50, help="Mensajes a procesar")
    p.add_argument("--mock", action="store_true", help="Simula Kafka y Cassandra en memoria")
    return p.parse_args()

# -------------------------
# Simuladores (modo --mock)
# -------------------------
def _rand_coord(base_lat=40.41, base_lng=-3.70, spread=0.01):
    import random
    lat = base_lat + random.uniform(-spread, spread)
    lng = base_lng + random.uniform(-spread, spread)
    return round(lat, 6), round(lng, 6)

def generate_mock_messages(vehicle_id: str, n: int) -> List[Dict[str, Any]]:
    now = datetime.now(timezone.utc)
    msgs = []
    ts0 = now.isoformat()
    for i in range(n):
        lat, lng = _rand_coord()
        ts = ts0 if i == 0 else datetime.now(timezone.utc).isoformat()
        msgs.append({"vehicleId": vehicle_id, "lat": lat, "lng": lng, "ts": ts})
    return msgs

class FakeKafkaConsumer:
    def __init__(self, messages: List[Dict[str, Any]]):
        self._messages = messages
    def __iter__(self) -> Iterator[Dict[str, Any]]:
        for m in self._messages:
            yield m

class FakeCassandra:
    def __init__(self):
        self.rows = []  # [{vehicle_id, ts, lat, lng}]
    def upsert(self, vehicle_id: str, ts_iso: str, lat: float, lng: float):
        # clave lógica: (vehicle_id, ts)
        # si existe, reemplaza; si no, inserta
        found = False
        for i, r in enumerate(self.rows):
            if r["vehicle_id"] == vehicle_id and r["ts"] == ts_iso:
                self.rows[i] = {"vehicle_id": vehicle_id, "ts": ts_iso, "lat": lat, "lng": lng}
                found = True
                break
        if not found:
            self.rows.append({"vehicle_id": vehicle_id, "ts": ts_iso, "lat": lat, "lng": lng})
        # Ordena por ts desc
        self.rows.sort(key=lambda r: r["ts"], reverse=True)
    def count(self, vehicle_id: str) -> int:
        return sum(1 for r in self.rows if r["vehicle_id"] == vehicle_id)
    def last(self, vehicle_id: str):
        for r in self.rows:
            if r["vehicle_id"] == vehicle_id:
                return r
        return None

# -------------------------
# Modo REAL (Kafka/Cassandra)
# -------------------------
def iter_kafka(bootstrap: str, topic: str, group: str, limit: int) -> Iterable[Dict[str, Any]]:
    from kafka import KafkaConsumer
    consumer = KafkaConsumer(
        topic,
        bootstrap_servers=bootstrap,
        group_id=group,
        value_deserializer=lambda m: json.loads(m.decode("utf-8")),
        auto_offset_reset="earliest",
        enable_auto_commit=True,
    )
    count = 0
    for msg in consumer:
        yield msg.value
        count += 1
        if count >= limit:
            break

def connect_cassandra(hosts_csv: str):
    from cassandra.cluster import Cluster
    from cassandra.auth import PlainTextAuthProvider
    hosts = [h.strip() for h in hosts_csv.split(",") if h.strip()]
    user = os.getenv("CASSANDRA_USER", "")
    pwd  = os.getenv("CASSANDRA_PASS", "")
    auth = PlainTextAuthProvider(username=user, password=pwd) if user else None
    cluster = Cluster(hosts, auth_provider=auth)
    session = cluster.connect()
    return session

def ensure_schema(session, keyspace: str, table: str):
    ks = f"""
    CREATE KEYSPACE IF NOT EXISTS {keyspace}
      WITH replication = {{ 'class': 'SimpleStrategy', 'replication_factor': '1' }};
    """
    session.execute(ks)
    session.set_keyspace(keyspace)
    tbl = f"""
    CREATE TABLE IF NOT EXISTS {table} (
      vehicle_id text,
      ts timestamp,
      lat double,
      lng double,
      PRIMARY KEY (vehicle_id, ts)
    ) WITH CLUSTERING ORDER BY (ts DESC);
    """
    session.execute(tbl)

def upsert_point(session, table: str, vehicle_id: str, ts_iso: str, lat: float, lng: float):
    # En Cassandra el upsert es por PK
    q = f"INSERT INTO {table} (vehicle_id, ts, lat, lng) VALUES (%s, %s, %s, %s)"
    # Convert ts_iso -> datetime
    from datetime import datetime
    ts = datetime.fromisoformat(ts_iso.replace("Z","+00:00"))
    session.execute(q, (vehicle_id, ts, lat, lng))

def count_points(session, table: str, vehicle_id: str) -> int:
    q = f"SELECT count(*) FROM {table} WHERE vehicle_id=%s"
    row = session.execute(q, (vehicle_id,)).one()
    return int(row[0]) if row else 0

def last_point(session, table: str, vehicle_id: str):
    q = f"SELECT vehicle_id, ts, lat, lng FROM {table} WHERE vehicle_id=%s LIMIT 1"
    return session.execute(q, (vehicle_id,)).one()

# -------------------------
# Lógica principal
# -------------------------
def main():
    args = parse_args()
    print(f"[conf] mock={args.mock} bootstrap={args.bootstrap} topic={args.topic} group={args.group}")
    print(f"[conf] cassandra_hosts={args.cassandra_hosts} keyspace={args.keyspace} table={args.table}")
    print(f"[conf] vehicle_id={args.vehicle_id} limit={args.limit}")

    if args.mock:
        # Genera N mensajes y "consume"
        msgs = generate_mock_messages(args.vehicle_id, args.limit)
        consumer = FakeKafkaConsumer(msgs)
        store = FakeCassandra()
        for m in consumer:
            store.upsert(m["vehicleId"], m["ts"], float(m["lat"]), float(m["lng"]))
        total = store.count(args.vehicle_id)
        last = store.last(args.vehicle_id)
        print(f"[mock] total en 'Cassandra': {total}")
        print(f"[mock] último: {last}")
        # Validación simple
        assert total == args.limit, f"Se esperaban {args.limit} mensajes, llegaron {total}"
        assert last is not None, "No hay último registro"
        print("[mock] OK ✅")
        return

    # Modo real
    try:
        session = connect_cassandra(args.cassandra_hosts)
        ensure_schema(session, args.keyspace, args.table)
        # Consumir Kafka y persistir
        processed = 0
        for m in iter_kafka(args.bootstrap, args.topic, args.group, args.limit):
            if m.get("vehicleId") != args.vehicle_id:
                # si se desea filtrar por vehicleId, puedes omitir esta línea
                pass
            upsert_point(session, args.table, m["vehicleId"], m["ts"], float(m["lat"]), float(m["lng"]))
            processed += 1
        total = count_points(session, args.table, args.vehicle_id)
        last = last_point(session, args.table, args.vehicle_id)
        print(f"[real] procesados ahora: {processed}")
        print(f"[real] total en Cassandra para {args.vehicle_id}: {total}")
        print(f"[real] último registro: {last}")
        if processed == 0:
            print("[warn] No se procesaron mensajes en esta corrida.")
        print("[real] OK ✅")
    except Exception as e:
        print(f"[error] {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
