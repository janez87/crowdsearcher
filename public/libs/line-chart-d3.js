lineChart = function(data,title){
	console.log("test--->",data);

		//start d3 plotting
		var margin ={"top":50,"right":50,"bottom":50,"left":50},
			width = 1000 - margin.right - margin.left,
			height = 300 - margin.top - margin.bottom;
		var FREQUENCE =10; //default

		var xMin,
			xMax,
			yMin,
			yMax;
		var xValues=[],
			yValues=[];
		data.forEach(function(item){
			xValues.push(item.time);
			yValues.push(item.count);
		});
		xValues.forEach(function(value){
			if (!xMin && !xMax) {
				xMin=value;
				xMax=value;
			};
			if (value<xMin) {
				xMin=value;
			}else if(value>xMax){
				xMax=value;
			}
		});
		yValues.forEach(function(value){
			if (!yMin && !yMax) {
				yMin=value;
				yMax=value;
			};
			if (value<yMin) {
				yMin=value;
			}else if(value>yMax){
				yMax=value;
			}
		});

		var x = d3.scale.linear().domain([xMin, xMax]).range([0, width]);
		var y = d3.scale.linear().domain([0, yMax]).range([height, 0]);

		var formatTime = d3.time.format("%H:%M"),
			formatTime2 = d3.time.format("%y-%m-%d")
			formatMinutes = function(d){return formatTime(new Date(d));},
			formatDate = function(d){return formatTime2(new Date(d));};

		var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(FREQUENCE).tickFormat(formatMinutes);
		var xAxisLarge = d3.svg.axis().scale(x).orient("top").ticks(FREQUENCE/5).tickFormat(formatDate);
		var yAxis = d3.svg.axis().scale(y).orient("left").ticks(5);

		var line = d3.svg.line()
			.x(function(d) { 
				return x(d.time); 
			})
			.y(function(d) { 
				return y(d.count); 
			});
			
		var graph = d3.select("body").append("svg:svg")
				.attr("class","lineChart")
		      .attr("width", width+margin.left+margin.right)
		      .attr("height", height+margin.top+margin.bottom)
		    .append("svg:g")
		      .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  			graph.append("g")
  				.attr("class","x axis")
  				.attr("transform","translate(0,"+height+")")
  				.call(xAxis)     
  				.append("text")
			      .attr("x", width-10)
			      .attr("dx", ".71em")
			      .style("text-anchor", "end")
			      .text("Time");

  			graph.append("g")
  				.attr("class","x axis large")
  				.attr("transform","translate(0,"+(height+40)+")")
  				.call(xAxisLarge);
			
			graph.append("g")
			      .attr("class", "y axis")
			      .call(yAxis)
			      .append("text")
			      .attr("transform", "rotate(-90)")
			      .attr("y", 6)
			      .attr("dy", ".71em")
			      .style("text-anchor", "end")
			      .text("ActiveExecution (#)");
			 graph.append("text")
			 		.attr("x",(width/2))
			 		.attr("y",0-(margin.top/2))
			 		.attr("text-anchor","middle")
			 		.style("font-size","16px")
			 		.style("text-decoration", "underline")
			 		.text(title)

  			graph.append("svg:path")
  			.attr("class","line")
  			.attr("d", line(data));
};
		