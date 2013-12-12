donutChart = function(figData,figName,figLabels){
		var total = 0;
		for (var i = 0; i < figData.length; i++) {
			total+=figData[i];
		}
		/*
		define width, height, radius and arc.
		 */
		var w = 250,                 
		    h = 250,
		    r = Math.min(w, h) / 2,
		    color = ["#f36b12","#025ffc","#fe4226"],
		    arc = d3.svg.arc().innerRadius(r - 70).outerRadius(r - 20),
		    donut = d3.layout.pie().sort(null);
		// ---------------------------------------------------------------------
		var svg = d3.select("body")
			.append("svg:svg")
			.attr("class","donutChart")
		    .attr("width", w)
		    .attr("height", h);

	   /*
	   get the position for drawing arc, labels, dataName, dataTotalCount
	    */
		var arc_group = svg.append("svg:g")
		    .attr("class", "arcGroup")
		    .attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")");

		var label_group = svg.append("svg:g")
		    .attr("class", "labelGroup")
		    .attr("transform", "translate(" + (w / 2) + "," + (h / 2) + ")");

		var center_group = svg.append("svg:g")
		    .attr("class", "ctrGroup")
		    .attr("transform", "translate(" + (w / 2) + "," + (h / 2-20) + ")");

		var center_number_group = svg.append("svg:g")
		    .attr("class", "ctrGroup")
		    .attr("class","number")
		    .attr("transform", "translate(" + (w / 2) + "," + (h / 2+10) + ")");

		// draw center dataName and totalCount
		var pieLabel = center_group.append("svg:text")
		    .attr("dy", ".35em")
		    .attr("class", "chartName")
		    .attr("text-anchor", "middle")
		    .text("#"+figName);

		var pieLabelNumber = center_number_group.append("svg:text")
		    .attr("dy", ".35em")
		    .attr("class", "chartLabelNumber")
		    .attr("text-anchor", "middle")
		    .text(total);

		// draw arc path and each slice label
		var arcs = arc_group.selectAll("path")
		    .data(donut(figData))
		    .enter()
		    .append("svg:path")
		    .attr("class","arc")
		    .attr("fill", function(d, i) {return color[i];})
		    .attr("d", arc);

		var sliceLabel = label_group.selectAll("text")
		    .data(donut(figData))
		    .enter()
		    .append("svg:text")
		    .attr("class", "arcLabel")
		    .attr("transform", function(d) {return "translate(" + arc.centroid(d) + ")"; })
		    .attr("text-anchor", "middle")
		    .text(function(d, i) {if((d.endAngle-d.startAngle)>=0.1){return figLabels[i];} else{return "";}});
	}