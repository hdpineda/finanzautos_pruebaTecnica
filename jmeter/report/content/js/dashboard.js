/*
   Licensed to the Apache Software Foundation (ASF) under one or more
   contributor license agreements.  See the NOTICE file distributed with
   this work for additional information regarding copyright ownership.
   The ASF licenses this file to You under the Apache License, Version 2.0
   (the "License"); you may not use this file except in compliance with
   the License.  You may obtain a copy of the License at

       http://www.apache.org/licenses/LICENSE-2.0

   Unless required by applicable law or agreed to in writing, software
   distributed under the License is distributed on an "AS IS" BASIS,
   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
   See the License for the specific language governing permissions and
   limitations under the License.
*/
var showControllersOnly = false;
var seriesFilter = "";
var filtersOnlySampleSeries = true;

/*
 * Add header in statistics table to group metrics by category
 * format
 *
 */
function summaryTableHeader(header) {
    var newRow = header.insertRow(-1);
    newRow.className = "tablesorter-no-sort";
    var cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Requests";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 3;
    cell.innerHTML = "Executions";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 7;
    cell.innerHTML = "Response Times (ms)";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 1;
    cell.innerHTML = "Throughput";
    newRow.appendChild(cell);

    cell = document.createElement('th');
    cell.setAttribute("data-sorter", false);
    cell.colSpan = 2;
    cell.innerHTML = "Network (KB/sec)";
    newRow.appendChild(cell);
}

/*
 * Populates the table identified by id parameter with the specified data and
 * format
 *
 */
function createTable(table, info, formatter, defaultSorts, seriesIndex, headerCreator) {
    var tableRef = table[0];

    // Create header and populate it with data.titles array
    var header = tableRef.createTHead();

    // Call callback is available
    if(headerCreator) {
        headerCreator(header);
    }

    var newRow = header.insertRow(-1);
    for (var index = 0; index < info.titles.length; index++) {
        var cell = document.createElement('th');
        cell.innerHTML = info.titles[index];
        newRow.appendChild(cell);
    }

    var tBody;

    // Create overall body if defined
    if(info.overall){
        tBody = document.createElement('tbody');
        tBody.className = "tablesorter-no-sort";
        tableRef.appendChild(tBody);
        var newRow = tBody.insertRow(-1);
        var data = info.overall.data;
        for(var index=0;index < data.length; index++){
            var cell = newRow.insertCell(-1);
            cell.innerHTML = formatter ? formatter(index, data[index]): data[index];
        }
    }

    // Create regular body
    tBody = document.createElement('tbody');
    tableRef.appendChild(tBody);

    var regexp;
    if(seriesFilter) {
        regexp = new RegExp(seriesFilter, 'i');
    }
    // Populate body with data.items array
    for(var index=0; index < info.items.length; index++){
        var item = info.items[index];
        if((!regexp || filtersOnlySampleSeries && !info.supportsControllersDiscrimination || regexp.test(item.data[seriesIndex]))
                &&
                (!showControllersOnly || !info.supportsControllersDiscrimination || item.isController)){
            if(item.data.length > 0) {
                var newRow = tBody.insertRow(-1);
                for(var col=0; col < item.data.length; col++){
                    var cell = newRow.insertCell(-1);
                    cell.innerHTML = formatter ? formatter(col, item.data[col]) : item.data[col];
                }
            }
        }
    }

    // Add support of columns sort
    table.tablesorter({sortList : defaultSorts});
}

$(document).ready(function() {

    // Customize table sorter default options
    $.extend( $.tablesorter.defaults, {
        theme: 'blue',
        cssInfoBlock: "tablesorter-no-sort",
        widthFixed: true,
        widgets: ['zebra']
    });

    var data = {"OkPercent": 21.666666666666668, "KoPercent": 78.33333333333333};
    var dataset = [
        {
            "label" : "FAIL",
            "data" : data.KoPercent,
            "color" : "#FF6347"
        },
        {
            "label" : "PASS",
            "data" : data.OkPercent,
            "color" : "#9ACD32"
        }];
    $.plot($("#flot-requests-summary"), dataset, {
        series : {
            pie : {
                show : true,
                radius : 1,
                label : {
                    show : true,
                    radius : 3 / 4,
                    formatter : function(label, series) {
                        return '<div style="font-size:8pt;text-align:center;padding:2px;color:white;">'
                            + label
                            + '<br/>'
                            + Math.round10(series.percent, -2)
                            + '%</div>';
                    },
                    background : {
                        opacity : 0.5,
                        color : '#000'
                    }
                }
            }
        },
        legend : {
            show : true
        }
    });

    // Creates APDEX table
    createTable($("#apdexTable"), {"supportsControllersDiscrimination": true, "overall": {"data": [0.03333333333333333, 500, 1500, "Total"], "isController": false}, "titles": ["Apdex", "T (Toleration threshold)", "F (Frustration threshold)", "Label"], "items": [{"data": [0.06666666666666667, 500, 1500, "HTTPBin - GET /delay/1"], "isController": false}, {"data": [0.0, 500, 1500, "ReqRes - POST /api/users (Create User)"], "isController": false}]}, function(index, item){
        switch(index){
            case 0:
                item = item.toFixed(3);
                break;
            case 1:
            case 2:
                item = formatDuration(item);
                break;
        }
        return item;
    }, [[0, 0]], 3);

    // Create statistics table
    createTable($("#statisticsTable"), {"supportsControllersDiscrimination": true, "overall": {"data": ["Total", 60, 47, 78.33333333333333, 1366.0666666666668, 249, 5261, 902.5, 3007.7999999999993, 4596.099999999998, 5261.0, 1.3079019073569482, 1.3684434604904632, 0.20372104904632152], "isController": false}, "titles": ["Label", "#Samples", "FAIL", "Error %", "Average", "Min", "Max", "Median", "90th pct", "95th pct", "99th pct", "Transactions/s", "Received", "Sent"], "items": [{"data": ["HTTPBin - GET /delay/1", 30, 17, 56.666666666666664, 2379.1, 1344, 5261, 2023.5, 4572.200000000001, 5169.15, 5261.0, 0.6582845105654664, 0.33777795377745595, 0.07457129221249424], "isController": false}, {"data": ["ReqRes - POST /api/users (Create User)", 30, 30, 100.0, 353.0333333333333, 249, 461, 347.0, 443.9, 453.3, 461.0, 0.6883259911894274, 1.0871831190918686, 0.1364552502064978], "isController": false}]}, function(index, item){
        switch(index){
            // Errors pct
            case 3:
                item = item.toFixed(2) + '%';
                break;
            // Mean
            case 4:
            // Mean
            case 7:
            // Median
            case 8:
            // Percentile 1
            case 9:
            // Percentile 2
            case 10:
            // Percentile 3
            case 11:
            // Throughput
            case 12:
            // Kbytes/s
            case 13:
            // Sent Kbytes/s
                item = item.toFixed(2);
                break;
        }
        return item;
    }, [[0, 0]], 0, summaryTableHeader);

    // Create error table
    createTable($("#errorsTable"), {"supportsControllersDiscrimination": false, "titles": ["Type of error", "Number of errors", "% in errors", "% in all samples"], "items": [{"data": ["The operation lasted too long: It took 2,034 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,408 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["502/Bad Gateway", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 4,620 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 4,142 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 5,261 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,682 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,022 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,282 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 3,044 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,185 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,161 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,630 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 2,286 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 5,094 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["401/Unauthorized", 30, 63.829787234042556, 50.0], "isController": false}, {"data": ["The operation lasted too long: It took 2,025 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}, {"data": ["The operation lasted too long: It took 3,882 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, 2.127659574468085, 1.6666666666666667], "isController": false}]}, function(index, item){
        switch(index){
            case 2:
            case 3:
                item = item.toFixed(2) + '%';
                break;
        }
        return item;
    }, [[1, 1]]);

        // Create top5 errors by sampler
    createTable($("#top5ErrorsBySamplerTable"), {"supportsControllersDiscrimination": false, "overall": {"data": ["Total", 60, 47, "401/Unauthorized", 30, "The operation lasted too long: It took 2,034 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, "The operation lasted too long: It took 2,408 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, "502/Bad Gateway", 1, "The operation lasted too long: It took 4,620 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1], "isController": false}, "titles": ["Sample", "#Samples", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors", "Error", "#Errors"], "items": [{"data": ["HTTPBin - GET /delay/1", 30, 17, "The operation lasted too long: It took 2,034 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, "The operation lasted too long: It took 2,408 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, "502/Bad Gateway", 1, "The operation lasted too long: It took 4,620 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1, "The operation lasted too long: It took 4,142 milliseconds, but should not have lasted longer than 2,000 milliseconds.", 1], "isController": false}, {"data": ["ReqRes - POST /api/users (Create User)", 30, 30, "401/Unauthorized", 30, "", "", "", "", "", "", "", ""], "isController": false}]}, function(index, item){
        return item;
    }, [[0, 0]], 0);

});
