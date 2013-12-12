StackedBarChart = function (data) {
	var width = 960,
	height = 300,
	margin = {"top":20,"right":30,"bottom":30,"left":30},
	x = d3.scale.ordinal().rangeRoundBands([0, width - margin.left - margin.right]),
	y = d3.scale.linear().range([0, height - margin.top - margin.bottom]),
	color = d3.scale.ordinal().range(["pink", "lightblue", "darkgray"]);
	 
	var svg = d3.select("body").append("svg:svg")
				.attr("class","stackedBar")
				.attr("shape-rendering","crispEdges")
				.attr("width", width)
				.attr("height", height)
				.append("svg:g")
				.attr("transform", "translate(" + margin.left + "," + (height - margin.top-margin.bottom) + ")");
	 
	// Transpose the data into layers by answer.
	var answers = d3.layout.stack()(["correct", "wrong", "invalid"].map(function(answer) {
	return data.map(function(d) {
	return {x: d.id, y: +d[answer]};
	});
	}));

	// Compute the x-domain (by date) and y-domain (by top).
	x.domain(answers[0].map(function(d) { return d.x; }));
	y.domain([0, d3.max(answers[answers.length - 1], function(d) {return d.y0 + d.y; })]);
	 
	// Add a group for each answer.
	var answer = svg.selectAll("g.answer")
				.data(answers)
				.enter().append("svg:g")
				.style("fill", function(d, i) { return color(i); })
				.style("stroke", function(d, i) { return d3.rgb(color(i)).darker(); });
	 
	// Add a rect for each date.
	var rect = answer.selectAll("rect")
				.data(Object)
				.enter().append("svg:rect")
				.attr("x", function(d) { return x(d.x); })
				.attr("y", function(d) { return -y(d.y0) - y(d.y); })
				.attr("height", function(d) { return y(d.y); })
				.attr("width", x.rangeBand()-5);
	 
	// Add a label per date.
	var label = svg.selectAll("text")
				.data(x.domain())
				.enter().append("svg:text")
				.attr("x", function(d) { return x(d) + x.rangeBand() / 2; })
				.attr("y", 6)
				.attr("text-anchor", "middle")
				.attr("dy", ".71em")
				.text(function(d){return "Pid-"+d;});

	// Add y-axis rules.
	var rule = svg.selectAll("g.rule")
				.data(y.ticks(5))
				.enter().append("svg:g")
				.attr("transform", function(d) { return "translate(0," + -y(d) + ")"; });
				rule.append("svg:line")
				.attr("x2", width - margin.left - margin.right)
				.style("stroke", function(d) { return d ? "#fff" : "#000"; })
				.style("stroke-opacity", function(d) { return d ? .7 : null; });
				rule.append("svg:text")
				.attr("x", width - margin.left - margin.right+ 6)
				.attr("dy", ".35em")
				.text(d3.format(",d"));

	var labels = ["Correct","Wrong","Invalid"]; 
	var legend = svg.selectAll(".legend")
	      .data(color.domain().slice())
	    .enter().append("svg:g")
	      .attr("transform", function(d, i) {return "translate("+(width-margin.right-100)+"," + (i*20 - height+margin.top+50) + ")"; });
	  legend.append("rect")
	      .attr("x", 18)
	      .attr("width", 18)
	      .attr("height", 15)
	      .style("fill", function(d,i){return color(i)});
	  legend.append("text")
	      .attr("x", 12)
	      .attr("y", 7)
	      .attr("dy", ".35em")
	      .style("text-anchor", "end")
	      .text(function(d) {return labels[d]; });
};