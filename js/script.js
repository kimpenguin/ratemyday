// Resources and Inspiration: 
// http://bl.ocks.org/abeppu/1074045
// http://blog.scottlogic.com/2014/09/19/interactive.html

//###################
// The data wasn't structured like a standard JSON file. Instead of an array of objects, there 
// were space delimited objects. I didn't want to make modifications to the original file, 
// so getData gets the data as a string and make it an array of objects
function getData(range, startDate){
  d3.text('data/day_rating.json', function(data){
    var dataArray=[];
    // create an array of objects and parse
    var dataSplit=data.split("\n");
    for(var i=0;i<dataSplit.length-1;i++){
      dataArray.push(JSON.parse(dataSplit[i]));
    }

    // checks if user selects a start date from the Calendar
    if(!startDate){
      startDate=0;
    }else{
      startDate=dataArray.map(function(x) {return x.Date;}).indexOf(startDate)
    }

    // filter through data range type and call buildChart
    // all data
    if(range=="alldata"){
      callBuildChart(dataArray)
    // short-term 10 days
    }else if(range=="shortterm"){
      callBuildChart(dataArray.slice(startDate,(startDate+10)))
    // long-term 30 days
    }else if(range=="longterm"){
      // check if the selected date goes beyond available data
      if((startDate+30)>dataArray.length){
        var endDate=data.length
      }else{
        var endDate=30
      }
      callBuildChart(dataArray.slice(startDate,(startDate+endDate)))
    }
  });
}
//###################
// call the functions that will display the chart with appropriate data
function callBuildChart(data){
  $("svg").remove()
  $(".table").remove()
  modDateRange(data)
  generateTable(data)
  buildChart(data)
}
//###################
// change the date range in the chart header
function modDateRange(data){
  d3.select("#date-range").text(data[0].Date + " to " + data[data.length-1].Date)
}

// width and height of chart
var width = window.innerWidth;
var height = 400;

//###################
// compare two values and return the min or max
function findMin(a, b){ return a < b ? a : b ; }           
function findMax(a, b){ return a > b ? a : b; }    

// buildChart function - pseudo candlestick representation of power consumption data        
function buildChart(data){  
  // determine the min and max of the two relevant columns in the dataset
  // extract daily forecast
  var dailyForecast = data.map(function(x) {return x.Forecast;});
  var minDailyForecast=Math.min.apply(null, dailyForecast.filter(function(n) { return !isNaN(n); }));
  var maxDailyForecast=Math.max.apply(null, dailyForecast.filter(function(n) { return !isNaN(n); }));

  // extract daily actual
  var actualRating = data.map(function(x) {return x.Actual;});
  var minActualRating=Math.min.apply(null, actualRating.filter(function(n) { return !isNaN(n); }));
  var maxActualRating=Math.max.apply(null, actualRating.filter(function(n) { return !isNaN(n); }));

  // store min and max values for ranges
  var ymin=Math.floor(findMin(minDailyForecast, minActualRating))
  var ymax=Math.ceil(findMax(maxDailyForecast, maxActualRating))

  // set chart margins 
  var margin = width-(width*0.95);       
  var chart = d3.select("#chart")
    .append("svg:svg")
    .attr("class", "chart")
    .attr("width", width)
    .attr("height", height);

  // declare the scale for the x axis
  var x = d3.scale.linear()
    .domain([0,data.length])
    .range([margin,width-margin]);
  
  // define the scale for the y axis
  var y = d3.scale.linear()
    .domain([0,ymax])
    // .domain([0,ymax])
    .range([height-margin, margin]);

  // create the x axis
  var months=["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  var yearLoc=[]
  chart.selectAll("text.xaxis")
    .data(x.ticks(data.length))
    .enter().append("svg:text")
    .attr("class", "xaxis")
    .attr("x", x)
    .attr("y", height - margin)
    .attr("dy", 20)
    .attr("text-anchor", "middle")
    .style("font-size","10px")
    .text(function(d){ 
      if(d<data.length){
        var date=data[d].Date.split("-")
        if(d==0){
          yearLoc.push(data.indexOf(data[d]))
          return date[0];
        }else{
          var dateOld=data[d-1].Date.split("-")
          if(dateOld[0]!=date[0]){
            yearLoc.push(data.indexOf(data[d]))
            return date[0];
          }
        }
      }
    })

  // creating an array of the tick mark locations
  var loc=[]
  chart.selectAll(".xaxis").each(function(data) {
    var tick = d3.select(this);
    var tickLocation = tick.attr("x");
    loc.push(tickLocation);
  });
  
  // reference lines for x-axis
  chart.selectAll("line.x")
   .data(yearLoc)
   .enter().append("svg:line")
   .attr("class", "x")
   .attr("x1", x)
   .attr("x2", x)
   .attr("y1", margin)
   .attr("y2", height - margin)
   .attr("stroke", "#ccc");

  //y-axis 
  chart.selectAll("text.yaxis")
    .data(y.ticks(5))
    .enter().append("svg:text")
    .attr("class", "yaxis")
    .attr("x", 10)
    .attr("y", y)
    .attr("dy", 0)
    .attr("dx", 20)    
    .attr("text-anchor", "middle")
    .style("font-size","10px")
    .text(String)


  // reference lines on y-axis
  chart.selectAll("line.y")
     .data(y.ticks(9))
     .enter().append("svg:line")
     .attr("class", "y")
     .attr("x1", margin)
     .attr("x2", width - margin)
     .attr("y1", y)
     .attr("y2", y)
     .attr("stroke", "lightgray");

  // creating the bars
  chart.selectAll("rect")
    .data(data)
    .enter().append("svg:rect")
    .attr("x", function(d) {
      return loc[data.indexOf(d)];
    })
    .attr("y", function(d) {
      return y(findMax(d.Actual, d.Forecast));
    }) 
    // animate
    .attr("height", 0)
      .transition()
      .duration(10)
      .delay(function (d, i) {
        return i * 10;
      })
    .attr("height", function(d) { return y(findMin(d.Actual, d.Forecast))-y(findMax(d.Actual, d.Forecast));})
    .attr("width", function(d) { return 0.3 * (width - margin)/data.length; })
    .attr("fill",function(d) { return d.Actual > d.Forecast ? "blue" : "none" ;})
    .style("stroke", "blue")
    .style("stroke-width", 0.5);

  
  // *******************
  // build navigation
  var navMargin = {top: 10, right: margin, bottom: 60, left: margin}
  var navWidth = width - navMargin.left - navMargin.right
  var navHeight = 120 - navMargin.top - navMargin.bottom;

  var parseDate = d3.time.format("%Y-%m-%d").parse;

  var navX = d3.time.scale()
    .range([0, navWidth]);

  var navY = d3.scale.linear()
    .range([navHeight, 0]);

  // greater than 30 data points
  var xAxis = d3.svg.axis()
    .scale(navX)
    .orient("bottom")
    .ticks(d3.time.months,4)
    .tickSize(10, 0)
    .tickFormat(d3.time.format("%b"))

  // less than or equal 10 data points
  var xAxis2 = d3.svg.axis()
    .scale(navX)
    .orient("bottom")
    .ticks(10)
    .tickSize(10, 0)
    .tickFormat(d3.time.format("%b-%d"))
  // greater than 10 but less than 30 data points
  var xAxis3 = d3.svg.axis()
    .scale(navX)
    .orient("bottom")
    .ticks(30)
    .tickSize(10, 0)
    .tickFormat(d3.time.format("%b-%d"))

  var xAxisSecondary = d3.svg.axis()
    .scale(navX)
    .ticks(d3.time.year)
    .tickSize(10, 0)
    .tickFormat(d3.time.format("%Y"));

  var yAxis = d3.svg.axis()
    .scale(navY)
    .orient("left");

  // fill in the area when called
  var area = d3.svg.area()
    .x(function(d) { return navX(d.Date); })
    .y0(navHeight)
    .y1(function(d) { return navY(d.Actual); });

  // svg dimension specifications
  var svg = d3.select("#chart").append("svg")
    .attr("width", navWidth + navMargin.left + navMargin.right)
    .attr("height", navHeight + navMargin.top + navMargin.bottom)
    .append("g")
    .attr("transform", "translate(" + navMargin.left + "," + navMargin.top + ")");

  // parse date for x axis values
  data.forEach(function(d) {
    d.Date = parseDate(d.Date);
    if(d.Actual == "NaN"){
      d.Actual = 0;
    }else{
      d.Actual = d.Actual;
    }
  });

  // set the domain for x and y axis
  navX.domain(d3.extent(data, function(d) {return d.Date; }));
  navY.domain([0, d3.max(data, function(d) { return d.Actual; })]);

  // draw the data
  svg.append("path")
    .datum(data)
    .attr("class", "area")
    .attr("d", area)

  // x-axis
  if(data.length>30){
    svg.append("g")
      .attr("class", "nav-x-axis")
      .attr("transform", "translate(0," + navHeight + ")")
      .style("font-size","8px")
      .call(xAxis);
  }else if(data.length<=10){
    svg.append("g")
      .attr("class", "nav-x-axis")
      .attr("transform", "translate(0," + navHeight + ")")
      .style("font-size","8px")
      .call(xAxis2);
  }else{
    svg.append("g")
      .attr("class", "nav-x-axis")
      .attr("transform", "translate(0," + navHeight + ")")
      .style("font-size","8px")
      .call(xAxis3);
  }

  // second x-axis for year
  svg.append("g")
    .attr("class", "nav-x-axis-secondary")
    .attr("transform", "translate(0," + (navHeight*1.4) + ")")
    .style("font-size","8px")
    .call(xAxisSecondary);

  // y axis
  svg.append("g")
    .attr("class", "nav-y-axis")
    // .call(yAxis)
  .append("text")
    .attr("transform", "rotate(-90)")
    .attr("y", 6)
    .attr("dy", -20)
    .attr("x", -15)
    .style("text-anchor", "end")
    .style("font-size", "8px")
    .text("rating");

  // *******************
} //end buildChart

function generateTable(data){
  var dates = data.map(function(x) {return x.Date;});
  var dailyForecast = data.map(function(x) {return x.Forecast;});

  // extract actual daily consumption
  var actualRating = data.map(function(x) {return x.Actual;});

  // extract forecast error
  var forecastError = data.map(function(x) {return x.Error;});
  
  // ########
  // add values to tables
  d3.select("#data-date").selectAll("div")
    .data(dates)
    .enter()
    .append("div")
    .attr("class","table")
    .text(function(d) { return d; })
    .style("border-left", "1px black solid")

  d3.select("#data-forecast").selectAll("div")
    .data(dailyForecast)
    .enter()
    .append("div")
    .attr("class","table")
    .text(function(d) { return d; })
  
  d3.select("#data-actual").selectAll("div")
    .data(actualRating)
    .enter()
    .append("div")
    .attr("class","table")
    .text(function(d) { return d; })

  d3.select("#data-error").selectAll("div")
    .data(forecastError)
    .enter()
    .append("div")
    .attr("class","table")
    .text(function(d) { return d; })
    .style("color",function(d) { return d > 0 ? "red" : "green" ;})
}

// jQuery
$(document).ready(function(){
  // event listeners
  $("#alldata").on("click",function(){
    $("#alldata").addClass("active")
    $("#shortterm").removeClass("active")
    $("#longterm").removeClass("active")
    $("#selectday").hide();
    $('#calendar').hide();
    $('#directions').hide();
    $(".data-view").show();
    getData("alldata")
  })
  $("#shortterm").on("click",function(){
    $("#shortterm").addClass("active")
    $("#longterm").removeClass("active")
    $("#alldata").removeClass("active")
    $("#selectday").show();
    $(".data-view").show();
    $('#directions').hide();
    getData("shortterm")
  })
  $("#longterm").on("click",function(){
    $("#longterm").addClass("active")
    $("#shortterm").removeClass("active")
    $("#alldata").removeClass("active")
    $("#selectday").show();
    $(".data-view").show();
    $('#directions').hide();
    getData("longterm")
  })

  // ******
  // calendar
  $("#selectday").on("click",function(){
    $('#calendar').toggle();
  })

  // clndr
  $('#calendar').clndr({
    constraints: {
      endDate: '2015-12-31',
      startDate: '2015-01-01'
    },
    clickEvents: {
      click: function (target) {
        var startDate=target.date._i;
        // rebuild chart with starting date
        getData($(".active").attr("id"), target.date._i )
        $('#calendar').toggle();
      }
    }
  })
  //end of calendar
  

})

