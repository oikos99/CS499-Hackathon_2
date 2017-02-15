'use strict';
var request = require('request');
var parseString = require('xml2js').parseString;
var AWS = require('aws-sdk');
var parser = require('json-parser');

AWS.config.update({
    region: "us-west-2"
});

var docClient = new AWS.DynamoDB.DocumentClient();
//var table = "us_waiting_time";
var table = "bronco_express_bus_track";
var mostCurrentTime = 0;

module.exports.fetch = (event, context, callback) => {

    fetchBusInfo();

  const response = {
    statusCode: 200,
    body: JSON.stringify({
      message: 'Fetch successful!',
      //input: event,
    }),
  };

  callback(null, response);

  // Use this code if you don't use the http event with the LAMBDA-PROXY integration
  // callback(null, { message: 'Go Serverless v1.0! Your function executed successfully!', event });
};

module.exports.queryMostCurrentTime = (event, context, callback) => {
    queryMostCurrentTime(callback);
};





function fetchBusInfo() {
    request('https://rqato4w151.execute-api.us-west-1.amazonaws.com/dev/info', function (error, response, body) {
        if (!error && response.statusCode == 200) {

            var object = parser.parse(body);
            //console.log(object);
            mostCurrentTime = Date.now();
            for(var i = 0; i < object.length; i++) {
                //console.log(object[i].id);
                putItem(object[i].id + "", object[i].logo, object[i].lat, object[i].lng, object[i].route);
            }
        }
    })
}

function putItem(id, logo, lat, lng, route) {
    var params = {
        TableName:table,
        Item:{
            "id": id,
            "timestamp": mostCurrentTime,
            "logo": logo,
            "lat": lat,
            "lng": lng,
            "route": route
        }
    };

    console.log("Adding a new item...");
    docClient.put(params, function(err, data) {
        if (err) {
            console.error("Unable to add item. Error JSON:", JSON.stringify(err, null, 2));
        } else {
            console.log("Added item:", JSON.stringify(data, null, 2));
        }
    });
}

function queryMostCurrentTime(callback) {
    
    fetchBusInfo();

    var params = {
        TableName : table,
        //ProjectionExpression:"#id, logo, lat, lng, route",
        FilterExpression: "#timestamp = :time",
        ExpressionAttributeNames:{
            //"#id": "id",
            "#timestamp": "timestamp",
        },
        ExpressionAttributeValues: {
            ":time": mostCurrentTime,
        }
    };

    docClient.scan(params, function(err, data) {
        if (err) {
            console.error("Unable to scan the table. Error JSON:", JSON.stringify(err, null, 2));
            if (callback) {
                const responseErr = {
                    statusCode: 500,
                    headers: {
                        "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
                    },
                    body: JSON.stringify({'err' : err}),
                };
                callback(null, responseErr);
            }
        } else {
            console.log("Scan succeeded.");
            data.Items.forEach(function(item) {
                console.log(item);
            });
            if (callback) {
                const responseOk = {
                    statusCode: 200,
                    headers: {
                        "Access-Control-Allow-Origin" : "*" // Required for CORS support to work
                    },
                    body: JSON.stringify(data.Items),
                };

                callback(null, responseOk);
            }
        }
    })
}