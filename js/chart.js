document.addEventListener("DOMContentLoaded", () => {
  d3.csv("data/lung_cancer.csv", d3.autoType).then(raw => {
    const data = raw.map(d => {
      const yn = v => (v === 2 ? "Yes" : "No");
      const symptomCols = [
        "SMOKING",
        "YELLOW_FINGERS",
        "ANXIETY",
        "PEER_PRESSURE",
        "CHRONIC DISEASE",
        "FATIGUE ",
        "ALLERGY ",
        "WHEEZING",
        "ALCOHOL CONSUMING",
        "COUGHING",
        "SHORTNESS OF BREATH",
        "SWALLOWING DIFFICULTY",
        "CHEST PAIN"
      ];

      let symptomCount = 0;
      symptomCols.forEach(col => {
        if (d[col] === 2) symptomCount += 1;
      });

      return {
        gender: d.GENDER,
        age: +d.AGE,
        smoking: yn(d.SMOKING),
        yellow_fingers: yn(d["YELLOW_FINGERS"]),
        anxiety: yn(d.ANXIETY),
        peer_pressure: yn(d["PEER_PRESSURE"]),
        chronic_disease: yn(d["CHRONIC DISEASE"]),
        fatigue: yn(d["FATIGUE "]),
        allergy: yn(d["ALLERGY "]),
        wheezing: yn(d.WHEEZING),
        alcohol: yn(d["ALCOHOL CONSUMING"]),
        coughing: yn(d.COUGHING),
        sob: yn(d["SHORTNESS OF BREATH"]),
        swallowing: yn(d["SWALLOWING DIFFICULTY"]),
        chest_pain: yn(d["CHEST PAIN"]),
        lung_cancer: d.LUNG_CANCER,
        symptomCount
      };
    });

    const width = 640;
    const height = 360;
    const margin = { top: 40, right: 30, bottom: 70, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const colorPrimary = "#2563eb";
    const colorPrimaryLight = "#bfdbfe";
    const colorSecondary = "#f97316";
    const colorNeutral = "#9ca3af";
    const colorYes = "#0f766e";
    const colorNo = "#e11d48";
    const colorLine = "#0f172a";

    const makeSvg = (selector) => {
      const svg = d3.select(selector)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      return g;
    };

    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip");

    const showTooltip = (html, event) => {
      tooltip
        .html(html)
        .style("left", (event.pageX + 16) + "px")
        .style("top", (event.pageY - 32) + "px")
        .classed("show", true);
    };

    const hideTooltip = () => tooltip.classed("show", false);

    function rateByCategory(data, categoryAccessor) {
      const groups = d3.group(data, categoryAccessor);
      const rows = [];

      groups.forEach((vals, key) => {
        const total = vals.length;
        const cancerYes = vals.filter(d => d.lung_cancer === "YES").length;
        const rate = cancerYes / total;
        rows.push({ key, total, cancerYes, rate });
      });
      return rows.sort((a, b) => d3.descending(a.rate, b.rate));
    }

    function addHorizontalGridlines(svg, yScale) {
      svg.append("g")
        .attr("class", "grid-y")
        .call(
          d3.axisLeft(yScale)
            .tickSize(-innerWidth)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-opacity", 0.7);
    }

    (function drawPrevalence() {
      const svg = makeSvg("#chart-overall");

      const counts = d3.rollup(
        data,
        v => v.length,
        d => d.lung_cancer
      );
      const rows = Array.from(counts, ([status, count]) => ({ status, count }));
      const totalN = d3.sum(rows, d => d.count);
      rows.forEach(d => d.pct = d.count / totalN);

      const x = d3.scaleBand()
        .domain(rows.map(d => d.status))
        .range([0, innerWidth])
        .padding(0.4);

      const y = d3.scaleLinear()
        .domain([0, d3.max(rows, d => d.count)]).nice()
        .range([innerHeight, 0]);

      addHorizontalGridlines(svg, y);

      const bars = svg.selectAll(".bar-prevalence")
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-prevalence")
        .attr("x", d => x(d.status))
        .attr("y", innerHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("rx", 6)
        .attr("fill", d => d.status === "YES" ? colorYes : colorNo)
        .attr("opacity", 0.9)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>${d.status}</strong><br>
             Count: ${d.count}<br>
             Share of sample: ${(d.pct * 100).toFixed(1)}%`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("transform", "translate(0,-4)");
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.9)
            .attr("transform", "translate(0,0)");
        });

      bars.transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.count))
        .attr("height", d => innerHeight - y(d.count));

      svg.selectAll(".bar-prevalence-label")
        .data(rows)
        .enter()
        .append("text")
        .attr("class", "bar-prevalence-label")
        .attr("x", d => x(d.status) + x.bandwidth() / 2)
        .attr("y", innerHeight - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#111827")
        .text(d => (d.pct * 100).toFixed(1) + "%")
        .transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.count) - 8);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Lung Cancer Status");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Number of Individuals");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "14px")
        .text("Overall Lung Cancer Prevalence");
    })();

    (function drawAgeHistogram() {
      const svg = makeSvg("#chart-age");

      const ages = data.map(d => d.age);
      const x = d3.scaleLinear()
        .domain(d3.extent(ages)).nice()
        .range([0, innerWidth]);

      const binsYes = d3.bin()
        .domain(x.domain())
        .thresholds(12)(
          data.filter(d => d.lung_cancer === "YES").map(d => d.age)
        );

      const binsNo = d3.bin()
        .domain(x.domain())
        .thresholds(12)(
          data.filter(d => d.lung_cancer === "NO").map(d => d.age)
        );

      const maxCount = d3.max([
        d3.max(binsYes, d => d.length),
        d3.max(binsNo, d => d.length)
      ]);

      const y = d3.scaleLinear()
        .domain([0, maxCount]).nice()
        .range([innerHeight, 0]);

      addHorizontalGridlines(svg, y);

      const bandWidth = innerWidth / binsYes.length;
      const barWidth = bandWidth * 0.45;

      const barsYes = svg.selectAll(".bar-age-yes")
        .data(binsYes)
        .enter()
        .append("rect")
        .attr("class", "bar-age-yes")
        .attr("x", d => x(d.x0) + bandWidth * 0.05)
        .attr("y", innerHeight)
        .attr("width", barWidth)
        .attr("height", 0)
        .attr("fill", colorYes)
        .attr("opacity", 0.8)
        .on("mousemove", (event, d) => {
          if (!d.length) return;
          showTooltip(
            `<strong>Lung cancer = YES</strong><br>
             Age: ${d.x0}–${d.x1}<br>
             Count: ${d.length}`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.8);
        });

      const barsNo = svg.selectAll(".bar-age-no")
        .data(binsNo)
        .enter()
        .append("rect")
        .attr("class", "bar-age-no")
        .attr("x", d => x(d.x0) + bandWidth * 0.5)
        .attr("y", innerHeight)
        .attr("width", barWidth)
        .attr("height", 0)
        .attr("fill", colorNo)
        .attr("opacity", 0.85)
        .on("mousemove", (event, d) => {
          if (!d.length) return;
          showTooltip(
            `<strong>Lung cancer = NO</strong><br>
             Age: ${d.x0}–${d.x1}<br>
             Count: ${d.length}`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.85);
        });

      barsYes.transition()
        .duration(900)
        .delay((d, i) => i * 40)
        .attr("y", d => y(d.length))
        .attr("height", d => innerHeight - y(d.length));

      barsNo.transition()
        .duration(900)
        .delay((d, i) => i * 40)
        .attr("y", d => y(d.length))
        .attr("height", d => innerHeight - y(d.length));

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Age");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -65)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Number of Individuals");

      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 170}, -5)`);

      legend.append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", 14).attr("height", 14)
        .attr("fill", colorYes);

      legend.append("text")
        .attr("x", 22).attr("y", 11)
        .text("Lung cancer = YES")
        .style("font-size", "12px");

      legend.append("rect")
        .attr("x", 0).attr("y", 22)
        .attr("width", 14).attr("height", 14)
        .attr("fill", colorNo);

      legend.append("text")
        .attr("x", 22).attr("y", 33)
        .text("Lung cancer = NO")
        .style("font-size", "12px");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "14px")
        .text("Age Distribution by Lung Cancer Status");
    })();

    (function drawGenderRate() {
      const svg = makeSvg("#chart-gender");
      const rows = rateByCategory(data, d => d.gender);

      const x = d3.scaleBand()
        .domain(rows.map(d => d.key))
        .range([0, innerWidth])
        .padding(0.4);

      const y = d3.scaleLinear()
        .domain([0, 1]).nice()
        .range([innerHeight, 0]);

      addHorizontalGridlines(svg, y);

      const bars = svg.selectAll(".bar-gender")
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-gender")
        .attr("x", d => x(d.key))
        .attr("y", innerHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("rx", 6)
        .attr("fill", colorPrimary)
        .attr("opacity", 0.9)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>Gender: ${d.key}</strong><br>
             Lung cancer: ${(d.rate * 100).toFixed(1)}%<br>
             YES: ${d.cancerYes} / Total: ${d.total}`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("transform", "translate(0,-4)");
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.9)
            .attr("transform", "translate(0,0)");
        });

      bars.transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.rate))
        .attr("height", d => innerHeight - y(d.rate));

      svg.selectAll(".bar-gender-label")
        .data(rows)
        .enter()
        .append("text")
        .attr("x", d => x(d.key) + x.bandwidth() / 2)
        .attr("y", innerHeight - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#111827")
        .text(d => (d.rate * 100).toFixed(1) + "%")
        .transition()
        .duration(900)
        .attr("y", d => y(d.rate) - 8);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => (d * 100).toFixed(0) + "%"));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Gender");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Lung Cancer Rate");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "14px")
        .text("Lung Cancer Rate by Gender");
    })();

    function drawBinaryRiskChart(containerSelector, label) {
      const svg = makeSvg(containerSelector);

      const rows = rateByCategory(data, d => d[label]);
      const x = d3.scaleBand()
        .domain(rows.map(d => d.key))
        .range([0, innerWidth])
        .padding(0.3);

      const y = d3.scaleLinear()
        .domain([0, 1]).nice()
        .range([innerHeight, 0]);

      addHorizontalGridlines(svg, y);

      const colorScale = d3.scaleOrdinal()
        .domain(["Yes", "No"])
        .range([colorSecondary, colorNeutral]);

      const bars = svg.selectAll(".bar-bin-" + label)
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-bin-" + label)
        .attr("x", d => x(d.key))
        .attr("y", innerHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("rx", 6)
        .attr("fill", d => colorScale(d.key))
        .attr("opacity", 0.95)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>${label}: ${d.key}</strong><br>
             Lung cancer: ${(d.rate * 100).toFixed(1)}%<br>
             YES: ${d.cancerYes} / Total: ${d.total}`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("transform", "translate(0,-4)");
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.95)
            .attr("transform", "translate(0,0)");
        });

      bars.transition()
        .duration(900)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.rate))
        .attr("height", d => innerHeight - y(d.rate));

      svg.selectAll(".bar-bin-label-" + label)
        .data(rows)
        .enter()
        .append("text")
        .attr("x", d => x(d.key) + x.bandwidth() / 2)
        .attr("y", innerHeight - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "12px")
        .style("fill", "#111827")
        .text(d => (d.rate * 100).toFixed(1) + "%")
        .transition()
        .duration(900)
        .attr("y", d => y(d.rate) - 8);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => (d * 100).toFixed(0) + "%"));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text(label + " (Yes / No)");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Lung Cancer Rate");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "14px")
        .text("Lung Cancer Rate by " + label.charAt(0).toUpperCase() + label.slice(1));
    }

    (function drawSmoking() {
      drawBinaryRiskChart("#chart-smoking", "smoking");
    })();

    (function drawAlcohol() {
      drawBinaryRiskChart("#chart-alcohol", "alcohol");
    })();

    (function drawSymptomCountRate() {
      const svg = makeSvg("#chart-symptom-count");

      const grouped = d3.group(data, d => d.symptomCount);
      const rows = Array.from(grouped, ([count, vals]) => {
        const total = vals.length;
        const yes = vals.filter(d => d.lung_cancer === "YES").length;
        return {
          count: +count,
          total,
          yes,
          rate: yes / total
        };
      }).sort((a, b) => d3.ascending(a.count, b.count));

      const x = d3.scaleLinear()
        .domain(d3.extent(rows, d => d.count))
        .range([0, innerWidth])
        .nice();

      const y = d3.scaleLinear()
        .domain([0, 1]).nice()
        .range([innerHeight, 0]);

      addHorizontalGridlines(svg, y);

      const area = d3.area()
        .x(d => x(d.count))
        .y0(innerHeight)
        .y1(d => y(d.rate));

      svg.append("path")
        .datum(rows)
        .attr("fill", colorPrimaryLight)
        .attr("opacity", 0.8)
        .attr("d", area)
        .attr("transform", "translate(0,0)")
        .attr("stroke", "none");

      const line = d3.line()
        .x(d => x(d.count))
        .y(d => y(d.rate))
        .curve(d3.curveMonotoneX);

      const path = svg.append("path")
        .datum(rows)
        .attr("fill", "none")
        .attr("stroke", colorLine)
        .attr("stroke-width", 2)
        .attr("d", line);

      const totalLength = path.node().getTotalLength();

      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1200)
        .ease(d3.easeCubicOut)
        .attr("stroke-dashoffset", 0);

      svg.selectAll(".sym-dot")
        .data(rows)
        .enter()
        .append("circle")
        .attr("class", "sym-dot")
        .attr("cx", d => x(d.count))
        .attr("cy", d => y(d.rate))
        .attr("r", 0)
        .attr("fill", colorPrimary)
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>Symptoms: ${d.count}</strong><br>
             Lung cancer: ${(d.rate * 100).toFixed(1)}%<br>
             YES: ${d.yes} / Total: ${d.total}`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", 7);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", 5);
        })
        .transition()
        .duration(700)
        .delay((d, i) => i * 60)
        .attr("r", 5);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(rows.length).tickFormat(d3.format("d")));

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => (d * 100).toFixed(0) + "%"));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Number of Positive Symptoms / Risk Flags");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Lung Cancer Rate");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "14px")
        .text("Lung Cancer Probability vs. Symptom Count");
    })();

    (function drawAgeSymptomScatter() {
      const svg = makeSvg("#chart-age-symptom");

      const x = d3.scaleLinear()
        .domain(d3.extent(data, d => d.age)).nice()
        .range([0, innerWidth]);

      const y = d3.scaleLinear()
        .domain(d3.extent(data, d => d.symptomCount)).nice()
        .range([innerHeight, 0]);

      const color = d3.scaleOrdinal()
        .domain(["YES", "NO"])
        .range([colorYes, colorNo]);

      addHorizontalGridlines(svg, y);

      const points = svg.selectAll(".point-age-sym")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "point-age-sym")
        .attr("cx", d => x(d.age))
        .attr("cy", d => y(d.symptomCount))
        .attr("r", 0)
        .attr("fill", d => color(d.lung_cancer))
        .attr("opacity", 0.8)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>${d.lung_cancer === "YES" ? "Lung cancer" : "No lung cancer"}</strong><br>
             Age: ${d.age}<br>
             Symptom count: ${d.symptomCount}<br>
             Smoking: ${d.smoking}<br>
             Alcohol: ${d.alcohol}`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(120)
            .attr("r", 6)
            .attr("opacity", 1);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(120)
            .attr("r", d => d.lung_cancer === "YES" ? 4.5 : 3.5)
            .attr("opacity", 0.8);
        });

      points
        .transition()
        .duration(600)
        .delay((d, i) => i * 3)
        .attr("r", d => d.lung_cancer === "YES" ? 4.5 : 3.5);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Age");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .text("Number of Positive Symptoms");

      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 170}, -5)`);

      ["YES", "NO"].forEach((label, i) => {
        legend.append("circle")
          .attr("cx", 0)
          .attr("cy", i * 22)
          .attr("r", 6)
          .attr("fill", color(label));

        legend.append("text")
          .attr("x", 16)
          .attr("y", i * 22 + 4)
          .style("font-size", "12px")
          .text(label === "YES" ? "Lung cancer = YES" : "Lung cancer = NO");
      });

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "14px")
        .text("Age vs. Symptom Burden, Colored by Lung Cancer Status");
    })();
  });
});
