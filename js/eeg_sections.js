/**
 * Modified from Jim Vallandingham's scroller tutorial
 * scrollVis - encapsulates
 * all the code for the visualization
 * using reusable charts pattern:
 * http://bost.ocks.org/mike/chart/
 */

var scrollVis = function() {

  // Set constants to define the size
  // and margins of the vis area.
  var width = 600;
  var height = 520;
  var margin = { top: 0, left: 20, bottom: 40, right: 10 };

  // Get height and width for animation viz
  var animationWidth = document.getElementById('animation').getBoundingClientRect().width;
  var animationHeight = document.getElementById('animation').getBoundingClientRect().height;

  // Get populated with other data by the set functions
  var ROCData = [];
  var segmentData = [];
  var confusionMatrixData = [];

  // Keep track of which visualization
  // we are on and which was the last
  // index activated. When user scrolls
  // quickly, we want to call all the
  // activate functions that they pass.
  var lastIndex = -1;
  var activeIndex = 0;

  // Set main svg used for visualization
  var svg = null;

  // d3 selection that will be used
  // for displaying all visualizations
  var g = null;

  // Create scales for mapping data to pixels
  var xScaleRVC = d3.scaleLinear().range([0, width]),
      yScaleRVC = d3.scaleLinear().range([height, 0]),
      xScaleROC = d3.scaleLinear().domain([0, 1.05]).range([0, 260]),
      yScaleROC = d3.scaleLinear().domain([0, 1.05]).range([260, 0]),
      xScaleDM = d3.scaleLinear().range([0, width]),
      yScaleDM = d3.scaleLinear().range([height, 0]),
      xAnimate = d3.scaleLinear().domain([0, 200]).range([0, animationWidth]),
      yAnimate = d3.scaleLinear().domain([-65, 60]).range([animationHeight, 0]),
      xCM = d3.scaleBand().domain([0, 1]).range([320, 580]).padding(0.05),
      yCM = d3.scaleBand().domain([0, 1]).range([0, 260]).padding(0.05);

  // Create axes for raw/clean time series, 
  // PCA scatterplot, ROC curves
  var xAxisRVC = d3.axisBottom().scale(xScaleRVC).ticks(0)
      yAxisRVC = d3.axisLeft().scale(yScaleRVC),
      xAxisROC = d3.axisBottom().scale(xScaleROC),
      yAxisROC = d3.axisLeft().scale(yScaleROC),
      xAxisDM = d3.axisBottom().scale(xScaleDM).ticks(0),
      yAxisDM = d3.axisLeft().scale(yScaleDM).ticks(0);

  // Create dropdown for selecting model
  var modelList = [
    { value: 0,
      text: "Logistic Regression"},
    { value: 1,
      text: "Neural Network"},
    { value: 2,
      text: "Random Forest"},
    { value: 3,
      text: "Boosting Method"}];

  d3.select("#dropdownModel")
    .selectAll("option")
    .data(modelList)
    .enter()
    .append("option")
    .attr("value", function(d) { return d.value; })
    .text(function(d) { return d.text; });

  var dropdownModel = d3.select("#dropdownModel");

  // Create dropdown for selecting electrode
  var electrodeList = [
    { value: "TP9",
      text: "TP9"},
    { value: "AF7",
      text: "AF7"},
    { value: "AF8",
      text: "AF8"},
    { value: "TP10",
      text: "TP10"}];

  d3.select("#dropdownElectrode")
    .selectAll("option")
    .data(electrodeList)
    .enter()
    .append("option")
    .attr("value", function(d) { return d.value; })
    .text(function(d) { return d.text; });

  var dropdownElectrode = d3.select("#dropdownElectrode");

  // Sizing constants for the grid visualization
  var circleRad = 2,
      circlePad = 22,
      numPerRow = width / (circleRad + circlePad);

  // Set palette (magma)
  var colors = ["#a50026","#d73027","#f46d43","#fdae61","#fee090","#ffffbf",
                "#e0f3f8","#abd9e9","#74add1","#4575b4","#313695"];

  // When scrolling to a new section,
  // the activation function for that
  // section is called.
  var activateFunctions = [];

  /**
   * chart
   *
   * @param selection - the current d3 selection(s)
   *  to draw the visualization in.
   */
  var chart = function(selection) {
    selection.each(function (rawVsClean) {

      // Create svg and give it a width and height
      svg = d3.select(this).selectAll('svg').data([rvcMap]);
      var svgE = svg.enter().append('svg');

      // @v4 use merge to combine enter and existing selection
      svg = svg.merge(svgE);
      svg.attr('width', width + margin.left + margin.right);
      svg.attr('height', height + margin.top + margin.bottom);
      svg.append('g');

      // This group element will be used to contain all
      // other elements.
      g = svg.select('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');

      /* CREATE ANIMATIONS */
      /// Time-series animation
      d3.select("#animation").append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", animationWidth)
        .attr("height", animationHeight);

      // Will get populated by generated EEG data for animation
      var TP9 =[],
          AF7 = [],
          AF8 = [],
          TP10 = [];

      d3.csv('data/generated_EEG_data.csv', function(data) {
          data.map(function(d) {
            TP9.push(+d.RAW_TP9);
            AF7.push(+d.RAW_AF7);
            AF8.push(+d.RAW_AF8);
            TP10.push(+d.RAW_TP10);
          })

          var channels = [TP9, AF7, AF8, TP10];

          d3.select("#animation").append("g")
            .attr("clip-path", "url(#clip)")
            .append("path")
            .datum(TP9)
            .attr("d", d3.line()
              .curve(d3.curveBasis)
              .x(function(d, i) { return xAnimate(i); })
              .y(function(d, i) { return yAnimate(d); }))
            .attr("class", "animated")
            .attr("stroke", colors[0])
            .attr("opacity", 0)
            .transition()
            .duration(200)
            .ease(d3.easeLinear)
            .on("start", tick);

          d3.select("#animation").append("g")
            .attr("clip-path", "url(#clip)")
            .append("path")
            .datum(AF7)
            .attr("d", d3.line()
              .curve(d3.curveBasis)
              .x(function(d, i) { return xAnimate(i); })
              .y(function(d, i) { return yAnimate(d); }))
            .attr("class", "animated")
            .attr("stroke", colors[1])
            .attr("opacity", 0)
            .transition()
            .duration(200)
            .ease(d3.easeLinear)
            .on("start", tick);

          d3.select("#animation").append("g")
            .attr("clip-path", "url(#clip)")
            .append("path")
            .datum(AF8)
            .attr("d", d3.line()
              .curve(d3.curveBasis)
              .x(function(d, i) { return xAnimate(i); })
              .y(function(d, i) { return yAnimate(d); }))
            .attr("class", "animated")
            .attr("stroke", colors[9])
            .attr("opacity", 0)
            .transition()
            .duration(200)
            .ease(d3.easeLinear)
            .on("start", tick);

          d3.select("#animation").append("g")
            .attr("clip-path", "url(#clip)")
            .append("path")
            .datum(TP10)
            .attr("d", d3.line()
              .curve(d3.curveBasis)
              .x(function(d, i) { return xAnimate(i); })
              .y(function(d, i) { return yAnimate(d); }))
            .attr("class", "animated")
            .attr("stroke", colors[10])
            .attr("opacity", 0)
            .transition()
            .duration(200)
            .ease(d3.easeLinear)
            .on("start", tick);
      });

      // Creates animation by removing the first data point, redrawing
      // the line, and then pushing that removed point to the end,
      // effectively creating an endless animation loop
      function tick() {
          d3.selectAll(".animated").attr("opacity", 1.0);

          // Remove first data point.
          shiftTP9 = TP9.shift();
          shiftAF7 = AF7.shift();
          shiftAF8 = AF8.shift();
          shiftTP10 = TP10.shift();

          // Redraw the line.
          d3.select(this)
            .attr("d", d3.line()
              .curve(d3.curveBasis)
              .x(function(d, i) { return xAnimate(i); })
              .y(function(d, i) { return yAnimate(d); }))
            .attr("transform", null);

          // Slide it to the left.
          d3.active(this)
            .attr("transform", "translate(" + xAnimate(-5) + ",0)")
            .transition()
            .on("start", tick);

          // Push first data point to back.
          TP9.push(shiftTP9);
          AF7.push(shiftAF7);
          AF8.push(shiftAF8);
          TP10.push(shiftTP10);
      }

      /// Pipeline animation
      var initial = "   ";
      names = ["1. COLLECT", "2. CLEAN", "3. TRANSFORM", "4. CLASSIFY", "5. EVALUATE", "6. CONTROL"];

      /// Update which text displays
      function updateText(data) {
        var t = d3.transition().duration(750);

        text = g.selectAll(".pipeline")
          .data(data, function(d) { return d; });

        text.attr("class", "pipeline")
          .attr("fill", colors[10])
          .transition(t)
          .attr("y", 250)
          .attr("x", function(d, i) { return (i * 32) + 100; });

        text.enter().append("text")
          .attr("class", "pipeline")
          .attr("fill", colors[10])
          .attr("dy", ".35em")
          .attr("y", 250)
          .attr("x", -100)
          .text(function(d) { return d; })
          .transition(t)
          .attr("x", function(d, i) { return (i * 32) + 100; });

        text.exit()
          .attr("class", "pipeline")
          .attr("fill", colors[0])
          .transition(t)
          .attr("x", 900)
          .remove();
      }

      // Initial display
      updateText(initial);

      // Animate every 3 seconds
      timer = d3.interval(function() {
        if (names.length != 0) {
          var name = names.shift();
          names.push(name);
          updateText(name.split(""));
        }
      }, 3000);

      // When user selects an electrode, reset viz
      dropdownElectrode.on("change", function() {
        svg.select("g").remove();
        svg.append('g');
        g = svg.select('g').attr('transform', 'translate(' + margin.left + ',' + margin.top + ')');
        var electrode = d3.event.target.value;
        var rvcMap = createRVCMap(rawVsClean, electrode);
        setupVis(rvcMap, ROCData, electrode, segmentMap, cmMap);
        showRaw();
      });

      // Initialize viz with default selection of electrode TP9
      var electrode = "TP9";
      var rvcMap = createRVCMap(rawVsClean, electrode);
      var segmentMap = createSegmentMap(segmentData);
      var cmMap = createCMMap(confusionMatrixData);
      setupVis(rvcMap, ROCData, electrode, segmentMap, cmMap);
      setupSections();
    });
  };

  /**
   * setupVis - creates initial elements for all
   * sections of the visualization.
   */
  var setupVis = function(RVCData, ROCData, electrode, segmentMap, cmMap) {

    // Set scales and domains from data
    xScaleRVC.domain(d3.extent(RVCData, function(d) { return d.time; }));
    yScaleRVC.domain([-300, 300]);
    xScaleDM.domain(d3.extent(segmentMap, function(d) { return d.feature1; }));
    yScaleDM.domain(d3.extent(segmentMap, function(d) { return d.feature2; }));

    ///////////////////
    /// TIME SERIES ///
    ///////////////////

    // line generator
    var line = d3.line()
      .x(function(d) { return xScaleRVC(d.time); })
      .y(function(d) { return yScaleRVC(d.raw); });

    // draw time series
    var path = g.append("path")
      .attr('class', 'raw line')
      .datum(RVCData)
      .attr("d", line)
      .attr("transform", "translate(40, -20)")
      .attr('stroke', colors[0])
      .attr('opacity', 0);

    // Needed for 'tracing out' animation
    var totalLength = path.node().getTotalLength();

    path.attr('stroke-dasharray', totalLength + " " + totalLength)
      .attr('stroke-dashoffset', totalLength)

    // Append x axis
    g.append("g")
      .attr("class", "raw axis axis--x")
      .attr("transform", "translate(40," + (height-20) + ")")
      .attr("stroke", "#767678")
      .call(xAxisRVC)
      .attr('opacity', 0);

    // Append y axis
    g.append("g")
      .attr("class", "raw axis axis--y")
      .attr("transform", "translate(40, -20)")
      .call(yAxisRVC)
      .attr("fill", "#767678")
      .attr('opacity', 0);

    // Text label for the x axis
    g.append("text")
      .attr("class", "raw axis label")             
      .attr("transform", "translate(" + (20 + width/2) + " ," + (height + margin.top + 20) + ")")
      .style("text-anchor", "middle")
      .text("Time")
      .attr("fill", "#767678")
      .attr('opacity', 0);

    // Text label for the y axis
    g.append("text")
      .attr("class", "raw axis label")
      .attr("transform", "rotate(-90)")
      .attr("y", 10 - margin.left)
      .attr("x", 20 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Frequency")
      .attr("fill", "#767678")
      .attr('opacity', 0);     

    // Title
    g.append("text")
      .attr("class", "raw chartTitle")
      .attr("transform", "translate(" + (20 + width/2) + " ," + 40 + ")")
      .style("text-anchor", "middle")
      .text("Electrode " + d3.select("#dropdownElectrode").node().value)
      .attr("fill", "#767678")
      .attr('opacity', 0);

    //////////////////////
    /// SEGMENT BOUNDS ///
    //////////////////////

    var segmentBound = d3.line()

    var bounds = [];
    for (var i = 0; i < width; i = i + (width/20)) bounds.push(i);
  
    for (var i = 0; i < bounds.length; i++) {
      var bound = g.append('path')
        .attr("class", "bounds")
        .attr("d", segmentBound([[bounds[i],height], [bounds[i],0]]))
        .attr("transform", "translate(40, -20)")
        .attr("stroke", "#767678")
        .attr('opacity', 0)
        .attr('stroke-dasharray', 520 + " " + 520)
        .attr('stroke-dashoffset', 520)
    }

    //////////////////////////
    /// SEGMENTS AS POINTS ///
    //////////////////////////

    tsMean = d3.mean(RVCData, function(d) { return d.clean; });

    g.append('path')
      .attr('class', 'annotation')
      .attr('d', 'M55 260 V 300 H 200')
      .attr('stroke', "#767678")
      .attr('fill', 'none')
      .attr('opacity', 0);

    g.append('text')
      .attr('class', 'annotation')
      .attr('fill', '#767678')
      .text('Each data point has 105 features!')
      .attr('transform', 'translate(215, 300)')
      .attr('opacity', 0);

    g.selectAll('.timeSeg').data(segmentMap)
      .enter()
      .append('circle')
      .attr('class', 'timeSeg')
      .attr('cx', function(d, i) {
        return i * (width / 20) + width/40;
      })
      .attr('cy', yScaleRVC(tsMean))
      .attr('r', 2)
      .attr('fill', colors[10])
      .attr('opacity', 0)
      .attr("transform", "translate(40, -20)");

    g.append("g")
      .attr("class", "dimReduced axis axis--x")
      .attr("transform", "translate(40," + (height-20) + ")")
      .attr("stroke", "#767678")
      .call(xAxisDM)
      .attr('opacity', 0);

    g.append("g")
      .attr("class", "dimReduced axis axis--y")
      .attr("transform", "translate(40, -20)")
      .call(yAxisDM)
      .attr("fill", "#767678")
      .attr('opacity', 0);    

    // text label for the x axis
    g.append("text")
      .attr("class", "dimReduced axis label")             
      .attr("transform", "translate(" + (20 + width/2) + " ," + (height + margin.top + 20) + ")")
      .style("text-anchor", "middle")
      .text("Feature 1")
      .attr("fill", "#767678")
      .attr('opacity', 0);

    // text label for the y axis
    g.append("text")
      .attr("class", "dimReduced axis label")
      .attr("transform", "rotate(-90)")
      .attr("y", 10 - margin.left)
      .attr("x", 20 - (height / 2))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Feature 2")
      .attr("fill", "#767678")
      .attr('opacity', 0);  

    /////////////////
    /// ROC CURVE ///
    /////////////////

    g.append("g")
      .attr("class", "roc axis axis--x")
      .attr("transform", "translate(40," + (height/2) + ")")
      .attr("fill", "#767678")
      .call(xAxisROC)
      .attr('opacity', 0);

    g.append("g")
      .attr("class", "roc axis axis--y")
      .attr("transform", "translate(40,0)")
      .attr("fill", "#767678")
      .call(yAxisROC)
      .attr('opacity', 0);

    // text label for the x axis
    g.append("text")
      .attr("class", "roc axis label")             
      .attr("transform", "translate(" + (20 + width/4) + " ," + (height/2 + 40) + ")")
      .style("text-anchor", "middle")
      .text("False Positive Rate")
      .attr("fill", "#767678")
      .attr('opacity', 0);

    // text label for the y axis
    g.append("text")
      .attr("class", "roc axis label")
      .attr("transform", "rotate(-90)")
      .attr("y", 10 - margin.left)
      .attr("x", margin.top - (height / 4))
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("True Positive Rate")
      .attr("fill", "#767678")
      .attr('opacity', 0);     

    g.append("text")
      .attr('class', 'roc text')
      .attr("x", 220)
      .attr("y", 250)
      .attr("fill", colors[9])
      .text('AUC: ')
      .attr('opacity', 0);

    var randomGuess = d3.line()
      
    g.append('path')
      .attr("class", "roc guide")
      .attr("d", randomGuess([[0,260], [260,0]]))
      .attr("transform", "translate(40,0)")
      .attr("stroke", "grey")
      .style("stroke-dasharray", ("3, 3"))
      .attr('opacity', 0);

    /////////////////////////////////
    /// CONFUSION MATRIX HEAT MAP ///
    /////////////////////////////////

    var cm = cmMap[0];

    var xAxisCM = d3.axisBottom(xCM).tickFormat(d3.timeFormat("%Y-%m")),
        yAxisCM = d3.axisLeft(yCM).ticks(10);

    var colorMap = d3.interpolateRgb(colors[6], colors[10]);

    var row = g.selectAll(".row")
      .data([[0, 0], [0, 0]])
      .enter().append("g")
      .attr("class", "cm row")
      .attr("transform", function(d, i) { return "translate(0," + yCM(i) + ")"; });

    var cell = row.selectAll(".cell")
      .data(function(d) { return d; })
      .enter().append("g")
      .attr("class", "cm cell")
      .attr("transform", function(d, i) { return "translate(" + xCM(i) + ", 0)"; });

    cell.append('rect')
      .attr("width", xCM.bandwidth())
      .attr("height", yCM.bandwidth())
      .style("stroke-width", 0);

    cell.append('text')
      .attr('class', 'cm count')
      .attr('dy', '.32em')
      .attr('x', xCM.bandwidth() / 2)
      .attr('y', yCM.bandwidth() / 2)
      .attr('text-anchor', 'middle')
      .attr('opacity', 1.0)
      .attr("fill", "black")
      .text(function(d, i) { return d3.format(".3n")(d); });

    // text label for the x axis
    g.append("text")
      .attr("class", "cm axis label")             
      .attr("transform", "translate(" + (240 + width/4) + " ," + (height/2 + 40) + ")")
      .style("text-anchor", "middle")
      .text("Actual +")
      .attr("fill", "#767678")
      .attr('opacity', 0);

    g.append("text")
      .attr("class", "cm axis label")             
      .attr("transform", "translate(" + (360 + width/4) + " ," + (height/2 + 40) + ")")
      .style("text-anchor", "middle")
      .text("Actual -")
      .attr("fill", "#767678")
      .attr('opacity', 0);

    // text label for the y axis
    g.append("text")
      .attr("class", "cm axis label")
      .attr("transform", "rotate(-90)")
      .attr("y", 590)
      .attr("x", -60)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Predicted +")
      .attr("fill", "#767678")
      .attr('opacity', 0);  

    g.append("text")
      .attr("class", "cm axis label")
      .attr("transform", "rotate(-90)")
      .attr("y", 590)
      .attr("x", -180)
      .attr("dy", "1em")
      .style("text-anchor", "middle")
      .text("Predicted -")
      .attr("fill", "#767678")
      .attr('opacity', 0);  

    d3.selectAll('.cm').attr('opacity', 0);

    var resolutions = [];
    
    for (var res in ROCData)
      resolutions.push(res)

    // Filters roc.json based on dropdown selection  
    var filteredData = filterJSON(ROCData, 1, 0);
    var auc = getAUC(ROCData, 1, 0);

    // Draw initial graph
    draw(filteredData, auc, cm);

    dropdownModel.on("change", function() {
      var model = d3.event.target.value;
      var resolution = resolutions[0];
      var filteredData = filterJSON(ROCData, resolution, model);
      var auc = getAUC(ROCData, resolution, model);
      draw(filteredData, auc, cmMap[model]);
    });

    // Gets called everytime a new model is selected
    function draw(data, auc, cm) {
      
      var line = d3.line()
        .x(function(d) { return xScaleROC(d.fpr); })
        .y(function(d) { return yScaleROC(d.tpr); });

      g.append("path")
        .data([data])
        .attr("d", line)
        .attr("class", "roc curve")
        .attr("fill", "none")
        .attr("stroke", colors[10])
        .attr("stroke-width", 2)
        .attr("opacity", 0)
        .attr("transform", "translate(40, 0)");

      g.append("text")
        .attr('class', 'roc text')
        .attr('id', 'auc')
        .data([auc])
        .attr("x", 260)
        .attr("y", 250)
        .attr("fill", colors[6])
        .attr('opacity', 0)
        .text(Math.round(auc*100) + "%");

      var selectCurve = g.selectAll(".curve").data([data]);
      selectCurve.enter().append("path").attr("class", ".curve");
      selectCurve.transition().duration(500).attr("d", line);
      selectCurve.exit().remove();

      var selectText = g.selectAll("#auc").data([auc])
      selectText.enter().text(Math.round(auc*100) + "%");
      selectText.transition().duration(500).text(Math.round(auc*100) + "%");
      selectText.exit().remove();

      var cmTotal = cm['tp'] + cm['tn'] + cm['fn'] + cm['fp'];
      var max = d3.max([cm['tp'], cm['tn'], cm['fn'], cm['fp']]);
      var cmNorm = [[cm['tp']/max, cm['fn']/max], [cm['fp']/max, cm['tn']/max]];

      var row = g.selectAll(".row").data(cmNorm);
      var cell = row.selectAll(".cell").data(function(d, i) { return cmNorm[i]; }).attr("fill", colorMap);

      row.selectAll(".count")
        .attr('class', 'cm count')
        .data(function(d, i) { return cmNorm[i]; })
        .attr('dy', '.32em')
        .attr('x', xCM.bandwidth() / 2)
        .attr('y', yCM.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('opacity', 1.0)
        .attr("fill", "black")
        .text(function(d, i) { return d3.format(".3n")(d*max); });

    }

  };

  /**
   * setupSections - each section is activated
   * by a separate function. Here we associate
   * these functions to the sections based on
   * the section's index.
   *
   */
  var setupSections = function() {  
    // activateFunctions are called each
    // time the active section changes
    activateFunctions[0] = hideAll;
    activateFunctions[1] = showPipeline;
    activateFunctions[2] = showRaw;
    activateFunctions[3] = showClean;
    activateFunctions[4] = drawBounds;
    activateFunctions[5] = showSegments;
    activateFunctions[6] = showDimReduced;
    activateFunctions[7] = showAllSegments;
    activateFunctions[8] = showClassifications;
    activateFunctions[9] = showROC;
    activateFunctions[10] = hideAll;
    activateFunctions[11] = hideAll;
  };

  /**
   * ACTIVATE FUNCTIONS
   *
   * These will be called their
   * section is scrolled to.
   *
   * General pattern is to ensure
   * all content for the current section
   * is transitioned in, while hiding
   * the content for the previous section
   * as well as the next section (as the
   * user may be scrolling up or down).
   *
   */

  function hideAll() {
    g.transition()
      .duration(0)
      .attr('opacity', 0);
  }

  function showPipeline() {
    names = ["1. COLLECT", "2. CLEAN", "3. TRANSFORM", "4. CLASSIFY", "5. EVALUATE", "6. CONTROL"];

    g.transition()
      .duration(0)
      .attr('opacity', 1.0);

    g.selectAll('.raw')
      .transition()//'transition4')
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.pipeline')
      .transition()//'transition5')
      .duration(0)
      .attr('opacity', 1.0);
  }

  function showRaw() {
    g.selectAll('.pipeline')
      .transition()
      .duration(0)
      .attr('opacity', 0);
    
    names = [];

    // show all of class 'raw'
    g.selectAll('.raw')
      .transition('transition7')
      .duration(300)
      .attr('opacity', 1.0);

    // color transition
    g.selectAll('.line')
      .transition('expand')
      .duration(1200)
      .attr('d', d3.line()
        .x(function(d) { return xScaleRVC(d.time); })
        .y(function(d) { return yScaleRVC(d.raw); }))
      .attr('stroke', colors[0]);

    // drawing out line animation
    g.selectAll('.line')
      .transition('trace')
      .duration(3000)
      .attr('stroke-dashoffset', 0);
  }

  function showClean() {
    g.selectAll('.line')
      .transition('showClean')
      .duration(1200)
      .attr('d', d3.line()
        .x(function(d) { return xScaleRVC(d.time); })
        .y(function(d) { return yScaleRVC(d.clean); }))
      .attr('stroke', colors[10])
      .attr('opacity', 1.0);

    g.selectAll('.raw')
      .transition()//'transition8')
      .duration(1200)
      .attr('opacity', 1.0);

    g.selectAll('.bounds')
      .transition()
      .duration(0)
      .attr('opacity', 0);
  }

  function drawBounds() {
    g.selectAll('.raw')
      .transition()
      .duration(0)
      .attr('opacity', 1.0);

    g.selectAll('.bounds')
      .transition()
      .duration(3000)
      .attr('opacity', .5)
      .attr('stroke-dashoffset', 0);

    g.selectAll('.chartTitle')
      .transition()
      .duration(0)
      .attr('opacity', 0);
  
    g.selectAll('.timeSeg')
      .transition()
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.annotation')
      .transition()
      .duration(0)
      .attr('opacity', 0);
  }

  function showSegments() {
    g.selectAll('.bounds')
      .transition()
      .duration(1800)
      .attr('opacity', 0);

    g.selectAll('.timeSeg')
      .transition()
      .duration(1200)
      .attr('cx', function(d, i) {
          return i * (width / 20) + width/40;
      })
      .attr('cy', yScaleRVC(tsMean))
      .attr('stroke', 'black')
      .attr('opacity', 1.0);

    g.selectAll('.annotation')
      .transition()
      .duration(1200)
      .attr('opacity', 1.0);

    g.selectAll('.raw')
      .transition()//'transition8')
      .duration(600)
      .attr('opacity', 0);

    g.selectAll('.dimReduced')
      .transition()
      .duration(1200)
      .attr('opacity', 0);
  }

  function showDimReduced() {
    g.selectAll('.dimReduced')
      .transition()
      .duration(1200)
      .attr('opacity', 1.0);

    g.selectAll('.annotation')
      .transition()
      .duration(1200)
      .attr('opacity', 0);

    g.selectAll('.timeSeg')
      .transition()
      .duration(1200)
      .attr('cx', function (d) { return xScaleDM(d.feature1) + 40; })
      .attr('cy', function (d) { return yScaleDM(d.feature2); })
      .attr("fill", function(d) { return d.fill; }) 
      .attr('stroke', 'black')     
      .attr('opacity', .6);
  }

  function showAllSegments() {
    g.selectAll('.annotation')
      .transition()
      .duration(1200)
      .attr('opacity', 0);

    g.selectAll('.timeSeg')
      .transition()
      .duration(1200)
      .attr('cx', function (d) { return d.x - 20;})
      .attr('cy', function (d) { return d.y + 50; })
      .attr("fill", function(d) { return d.fill; })
      .attr("stroke", "black")
      .attr('opacity', 1.0);

    g.selectAll('.dimReduced')
      .transition()
      .duration(1200)
      .attr('opacity', 0);
  }

  function showClassifications() {
    
    g.selectAll('.timeSeg')
      .transition()
      .duration(1200)
      .attr('cx', function (d) { return d.x - 20;})
      .attr('cy', function (d) { return d.y + 50; })
      .attr("stroke", function(d) {
          if (d.label != d.ensemble) {
              return colors[4];
          } else {
              return "black"; 
          }
      })
      .attr('fill', function(d) { return d.fill; })
      .attr('opacity', 1.0);

    g.selectAll('.roc')
      .transition()//'hideROC')
      .duration(300)
      .attr('opacity', 0);

    g.selectAll('.cm')
      .transition()
      .duration(300)
      .attr('opacity', 0);
  }

  function showROC() {

    g.transition()
      .duration(0)
      .attr('opacity', 1.0);

    g.selectAll('.timeSeg')
      .transition()//'transition9')
      .duration(0)
      .attr('opacity', 0);

    g.selectAll('.roc')
      .transition()//'showROC')
      .duration(300)
      .attr('opacity', 1.0);

    g.selectAll('.cm')
      .transition()
      .duration(300)
      .attr('opacity', 1.0);
  }

  /**
   * DATA FUNCTIONS
   *
   * Used to coerce the data into the
   * formats we need to visualize
   *
   */

  function createRVCMap(rawVsClean, electrode) {
    var raw_string = "RAW_" + electrode;
    var clean_string = "CLEAN_" + electrode;
    return rawVsClean.map(function (d, i) {
      d.time = i; // not really time, but no need to parse, only need ordering so use index i
      d.raw = +d[raw_string];
      d.clean = +d[clean_string];
      return d;
    });
  }

  function createSegmentMap(segmentData) {
    return segmentData.map(function (d, i) {
      d.index = i;
      d.feature2 = +d.feature2;
      d.feature1 = +d.feature1;
      d.label = +d.label;
      d.rf = +d.rf;
      d.nn = +d.nn;
      d.logreg = +d.logreg;
      d.ensemble = +d.ensemble;

      d.fill = d.label == 1 ? colors[0] : colors[10];

      // positioning for grid visual
      // stored here to make it easier
      // to keep track of.
      d.col = i % numPerRow;
      d.x = d.col * (circleRad + circlePad);
      d.row = Math.floor(i / numPerRow);
      d.y = d.row * (circleRad + circlePad);

      return d;
    });
  }

  function createCMMap(confusionMatrixData) {
    return confusionMatrixData.map(function (d, i) {
      d.model = i;
      d.fn = +d.fn;
      d.fp = +d.fp;
      d.tn = +d.tn;
      d.tp = +d.tp;

      return d;
    })
  }

  /**
  * filterJson - filters scoring data (fpr and tpr) based on resolution/model selection
  */
  function filterJSON(json, resIndex, modelIndex) {
    var result = json[resIndex][modelIndex];
    var filtered = [];

    for (i = 0; i < result['fpr'].length; i++) {
      var pair = {fpr: result['fpr'][i], tpr: result['tpr'][i]};
      filtered.push(pair);
    }
    return filtered;
  }

  /**
  * getAUC - retrieves AUC based on resolution/model selection
  */
  function getAUC(json, resIndex, modelIndex) {
    var auc = json[resIndex][modelIndex]['auc'];
    return auc;
  }

  /**
   * activate -
   *
   * @param index - index of the activated section
   */
  chart.activate = function (index) {
    activeIndex = index;
    var sign = (activeIndex - lastIndex) < 0 ? -1 : 1;
    var scrolledSections = d3.range(lastIndex + sign, activeIndex + sign, sign);
    scrolledSections.forEach(function (i) {
        activateFunctions[i]();
    });
    //activateFunctions[activeIndex]();
    lastIndex = activeIndex;
  };

  chart.setROCData = function(other) {
    ROCData = other;
  }

  chart.setSegmentData = function(other) {
    segmentData = other;
  }

  chart.setConfusionMatrixData = function(other) {
    confusionMatrixData = other;
  }

  return chart;
};

/**
 * display - called once data
 * has been loaded.
 * sets up the scroller and
 * displays the visualization.
 */
function display(error, data, ROCdata, segmentData, confusionMatrixData) {
  // create a new plot and
  // display it
  var plot = scrollVis();
  plot.setROCData(ROCdata);
  plot.setSegmentData(segmentData);
  plot.setConfusionMatrixData(confusionMatrixData);

  d3.select('#vis')
    .datum(data)
    .call(plot);

  // setup scroll functionality
  var scroll = scroller()
    .container(d3.select('#graphic'));

  // pass in .step selection as the steps
  scroll(d3.selectAll('.step'));

  // setup event handling
  scroll.on('active', function (index) {
    // highlight current step text
    d3.selectAll('.step')
      .style('opacity', function (d, i) { return i === index ? 1 : 0.1; });

    // activate current section
    plot.activate(index);
  });

}

// load data and display
d3.queue()
   .defer(d3.csv, 'data/allDataRawClean_subset.csv')
   .defer(d3.json, 'data/roc.json')
   .defer(d3.csv, 'data/segmentData.csv')
   .defer(d3.csv, 'data/confusionMatrix.csv')
   .await(display);
