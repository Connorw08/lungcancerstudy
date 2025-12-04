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

    // Palette
    const colorPrimary = "#3b82f6";
    const colorPrimaryLight = "#dbeafe";
    const colorSecondary = "#f59e0b";
    const colorNeutral = "#6b7280";
    const colorYes = "#059669";
    const colorNo = "#dc2626";
    const colorLine = "#1e293b";

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

    const makeSvg = (selector) => {
      const container = d3.select(selector);
      if (container.empty()) return null;

      const svg = container
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`);

      const g = svg.append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

      // Attach inner size to g so helpers can read it if needed
      g.innerWidth = innerWidth;
      g.innerHeight = innerHeight;

      return g;
    };

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
      if (!svg) return;
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

    // -------- Overall prevalence (index.html) --------
    (function drawPrevalence() {
      const svg = makeSvg("#chart-overall");
      if (!svg) return;

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
        .attr("rx", 8)
        .attr("fill", d => d.status === "YES" ? colorYes : colorNo)
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong style="font-size: 14px;">${d.status}</strong><br>
             <span style="color: #d1d5db;">Count:</span> <strong>${d.count}</strong><br>
             <span style="color: #d1d5db;">Percentage:</span> <strong>${(d.pct * 100).toFixed(1)}%</strong>`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("transform", "translate(0,-6)")
            .attr("rx", 10);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.85)
            .attr("transform", "translate(0,0)")
            .attr("rx", 8);
        })
        .on("click", function () {
          d3.select(this)
            .transition().duration(150).attr("opacity", 0.5)
            .transition().duration(150).attr("opacity", 1);
        });

      bars.transition()
        .duration(1000)
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
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#111827")
        .text(d => (d.pct * 100).toFixed(1) + "%")
        .transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.count) - 10);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

      svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Lung Cancer Status");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -60)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Number of Individuals");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "15px")
        .text("Overall Lung Cancer Prevalence");
    })();

    // -------- Age histogram (section1) --------
    (function drawAgeHistogram() {
      const svg = makeSvg("#chart-age");
      if (!svg) return;

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
        .attr("rx", 4)
        .attr("fill", colorYes)
        .attr("opacity", 0.8)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          if (!d.length) return;
          showTooltip(
            `<strong style="color: ${colorYes};">Lung cancer = YES</strong><br>
             <span style="color: #d1d5db;">Age range:</span> <strong>${d.x0}–${d.x1}</strong><br>
             <span style="color: #d1d5db;">Count:</span> <strong>${d.length}</strong>`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("y", d => y(d.length) - 4)
            .attr("height", d => innerHeight - y(d.length) + 4);
        })
        .on("mouseout", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.8)
            .attr("y", y(d.length))
            .attr("height", innerHeight - y(d.length));
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
        .attr("rx", 4)
        .attr("fill", colorNo)
        .attr("opacity", 0.8)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          if (!d.length) return;
          showTooltip(
            `<strong style="color: ${colorNo};">Lung cancer = NO</strong><br>
             <span style="color: #d1d5db;">Age range:</span> <strong>${d.x0}–${d.x1}</strong><br>
             <span style="color: #d1d5db;">Count:</span> <strong>${d.length}</strong>`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("y", d => y(d.length) - 4)
            .attr("height", d => innerHeight - y(d.length) + 4);
        })
        .on("mouseout", function (event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.8)
            .attr("y", y(d.length))
            .attr("height", innerHeight - y(d.length));
        });

      barsYes.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr("y", d => y(d.length))
        .attr("height", d => innerHeight - y(d.length));

      barsNo.transition()
        .duration(1000)
        .delay((d, i) => i * 50)
        .attr("y", d => y(d.length))
        .attr("height", d => innerHeight - y(d.length));

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("g")
        .call(d3.axisLeft(y))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Age");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -65)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Number of Individuals");

      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 170}, -5)`);

      legend.append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", 16).attr("height", 16)
        .attr("rx", 3)
        .attr("fill", colorYes);

      legend.append("text")
        .attr("x", 24).attr("y", 12)
        .text("Lung cancer = YES")
        .style("font-size", "12px")
        .style("font-weight", "500");

      legend.append("rect")
        .attr("x", 0).attr("y", 24)
        .attr("width", 16).attr("height", 16)
        .attr("rx", 3)
        .attr("fill", colorNo);

      legend.append("text")
        .attr("x", 24).attr("y", 36)
        .text("Lung cancer = NO")
        .style("font-size", "12px")
        .style("font-weight", "500");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "15px")
        .text("Age Distribution by Lung Cancer Status");
    })();

    // -------- Gender chart (section1) --------
    (function drawGenderRate() {
      const svg = makeSvg("#chart-gender");
      if (!svg) return;

      const rows = rateByCategory(data, d => d.gender);

      const x = d3.scaleBand()
        .domain(rows.map(d => d.key))
        .range([0, innerWidth])
        .padding(0.4);

      const y = d3.scaleLinear()
        .domain([0, 1]).nice()
        .range([innerHeight, 0]);

      addHorizontalGridlines(svg, y);

      const colorGender = d3.scaleOrdinal()
        .domain(rows.map(d => d.key))
        .range(["#8b5cf6", "#ec4899", "#0ea5e9", "#f97316"].slice(0, rows.length));

      const bars = svg.selectAll(".bar-gender")
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-gender")
        .attr("x", d => x(d.key))
        .attr("y", innerHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("rx", 8)
        .attr("fill", d => colorGender(d.key))
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong style="font-size: 14px;">Gender: ${d.key}</strong><br>
             <span style="color: #d1d5db;">Cancer rate:</span> <strong>${(d.rate * 100).toFixed(1)}%</strong><br>
             <span style="color: #d1d5db;">Cases:</span> <strong>${d.cancerYes} / ${d.total}</strong>`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("transform", "translate(0,-6)")
            .attr("rx", 10);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.85)
            .attr("transform", "translate(0,0)")
            .attr("rx", 8);
        });

      bars.transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.rate))
        .attr("height", d => innerHeight - y(d.rate));

      svg.selectAll(".bar-gender-label")
        .data(rows)
        .enter()
        .append("text")
        .attr("class", "bar-gender-label")
        .attr("x", d => x(d.key) + x.bandwidth() / 2)
        .attr("y", innerHeight - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#111827")
        .text(d => (d.rate * 100).toFixed(1) + "%")
        .transition()
        .duration(1000)
        .attr("y", d => y(d.rate) - 10);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => (d * 100).toFixed(0) + "%"))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Gender");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Lung Cancer Rate");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "15px")
        .text("Lung Cancer Rate by Gender");
    })();

    // -------- Reusable binary Yes/No chart (section2) --------
    function drawBinaryRiskChart(containerSelector, label) {
      const svg = makeSvg(containerSelector);
      if (!svg) return;

      const rows = rateByCategory(data, d => d[label]);
      const x = d3.scaleBand()
        .domain(rows.map(d => d.key))
        .range([0, innerWidth])
        .padding(0.35);

      const y = d3.scaleLinear()
        .domain([0, 1]).nice()
        .range([innerHeight, 0]);

      addHorizontalGridlines(svg, y);

      const colorScale = d3.scaleOrdinal()
        .domain(["Yes", "No"])
        .range(["#f97316", "#64748b"]);

      const bars = svg.selectAll(".bar-bin-" + label)
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-bin-" + label)
        .attr("x", d => x(d.key))
        .attr("y", innerHeight)
        .attr("width", x.bandwidth())
        .attr("height", 0)
        .attr("rx", 8)
        .attr("fill", d => colorScale(d.key))
        .attr("opacity", 0.85)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong style="font-size: 14px;">${label}: ${d.key}</strong><br>
             <span style="color: #d1d5db;">Cancer rate:</span> <strong>${(d.rate * 100).toFixed(1)}%</strong><br>
             <span style="color: #d1d5db;">Cases:</span> <strong>${d.cancerYes} / ${d.total}</strong>`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 1)
            .attr("transform", "translate(0,-6)")
            .attr("rx", 10);
        })
        .on("mouseout", function () {
          d3.select(this)
            .transition()
            .duration(200)
            .attr("opacity", 0.85)
            .attr("transform", "translate(0,0)")
            .attr("rx", 8);
        });

      bars.transition()
        .duration(1000)
        .ease(d3.easeCubicOut)
        .attr("y", d => y(d.rate))
        .attr("height", d => innerHeight - y(d.rate));

      svg.selectAll(".bar-bin-label-" + label)
        .data(rows)
        .enter()
        .append("text")
        .attr("class", "bar-bin-label-" + label)
        .attr("x", d => x(d.key) + x.bandwidth() / 2)
        .attr("y", innerHeight - 6)
        .attr("text-anchor", "middle")
        .style("font-size", "13px")
        .style("font-weight", "600")
        .style("fill", "#111827")
        .text(d => (d.rate * 100).toFixed(1) + "%")
        .transition()
        .duration(1000)
        .attr("y", d => y(d.rate) - 10);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "12px")
        .style("font-weight", "500");

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => (d * 100).toFixed(0) + "%"))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text(label.charAt(0).toUpperCase() + label.slice(1) + " (Yes / No)");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Lung Cancer Rate");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "15px")
        .text("Lung Cancer Rate by " + label.charAt(0).toUpperCase() + label.slice(1));
      
      // Optional: update stat cards if they exist (section2)
      if (label === "smoking") {
        const statEl = document.getElementById("smoking-stat");
        if (statEl && rows.length === 2) {
          const diff = ((rows[0].rate / rows[1].rate) - 1) * 100;
          statEl.textContent = `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`;
        }
      }
      if (label === "alcohol") {
        const statEl = document.getElementById("alcohol-stat");
        if (statEl && rows.length === 2) {
          const diff = ((rows[0].rate / rows[1].rate) - 1) * 100;
          statEl.textContent = `${diff > 0 ? "+" : ""}${diff.toFixed(0)}%`;
        }
      }
    }

    (function drawSmoking() {
      drawBinaryRiskChart("#chart-smoking", "smoking");
    })();

    (function drawAlcohol() {
      drawBinaryRiskChart("#chart-alcohol", "alcohol");
    })();

    // -------- Symptom count vs probability (section3) --------
    (function drawSymptomCountRate() {
      const svg = makeSvg("#chart-symptom-count");
      if (!svg) return;

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

      // Gradient for area
      const defs = svg.append("defs");
      const gradient = defs.append("linearGradient")
        .attr("id", "gradient-symptom")
        .attr("x1", "0%")
        .attr("x2", "0%")
        .attr("y1", "0%")
        .attr("y2", "100%");

      gradient.append("stop")
        .attr("offset", "0%")
        .attr("stop-color", colorPrimary)
        .attr("stop-opacity", 0.8);

      gradient.append("stop")
        .attr("offset", "100%")
        .attr("stop-color", colorPrimaryLight)
        .attr("stop-opacity", 0.3);

      const area = d3.area()
        .x(d => x(d.count))
        .y0(innerHeight)
        .y1(d => y(d.rate))
        .curve(d3.curveMonotoneX);

      svg.append("path")
        .datum(rows)
        .attr("fill", "url(#gradient-symptom)")
        .attr("opacity", 0.7)
        .attr("d", area);

      const line = d3.line()
        .x(d => x(d.count))
        .y(d => y(d.rate))
        .curve(d3.curveMonotoneX);

      const path = svg.append("path")
        .datum(rows)
        .attr("fill", "none")
        .attr("stroke", colorLine)
        .attr("stroke-width", 3)
        .attr("d", line);

      const totalLength = path.node().getTotalLength();

      path
        .attr("stroke-dasharray", totalLength + " " + totalLength)
        .attr("stroke-dashoffset", totalLength)
        .transition()
        .duration(1500)
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
        .attr("stroke-width", 2)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong style="font-size: 14px;">Symptoms: ${d.count}</strong><br>
             <span style="color: #d1d5db;">Cancer rate:</span> <strong>${(d.rate * 100).toFixed(1)}%</strong><br>
             <span style="color: #d1d5db;">Cases:</span> <strong>${d.yes} / ${d.total}</strong>`,
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
        .duration(800)
        .delay((d, i) => i * 40)
        .attr("r", 5);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(rows.length).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => (d * 100).toFixed(0) + "%"))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Number of Positive Symptoms / Risk Flags");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Lung Cancer Probability");

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "15px")
        .text("Lung Cancer Probability vs. Symptom Count");
    })();

    // -------- Age vs symptom scatter (section4) --------
    (function drawAgeSymptomScatter() {
      const svg = makeSvg("#chart-age-symptom");
      if (!svg) return;

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

      // vertical gridlines
      svg.append("g")
        .attr("class", "grid-x")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(
          d3.axisBottom(x)
            .tickSize(-innerHeight)
            .tickFormat("")
        )
        .selectAll("line")
        .attr("stroke", "#e5e7eb")
        .attr("stroke-opacity", 0.7);

      const points = svg.selectAll(".point-age-sym")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "point-age-sym")
        .attr("cx", d => x(d.age))
        .attr("cy", d => y(d.symptomCount))
        .attr("r", 0)
        .attr("fill", d => color(d.lung_cancer))
        .attr("stroke", "#ffffff")
        .attr("stroke-width", 1)
        .attr("opacity", 0.7)
        .style("cursor", "pointer")
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong style="font-size: 14px; color: ${color(d.lung_cancer)};">${d.lung_cancer === "YES" ? "Lung cancer" : "No lung cancer"}</strong><br>
             <span style="color: #d1d5db;">Age:</span> <strong>${d.age}</strong><br>
             <span style="color: #d1d5db;">Symptoms:</span> <strong>${d.symptomCount}</strong><br>
             <span style="color: #d1d5db;">Smoking:</span> <strong>${d.smoking}</strong><br>
             <span style="color: #d1d5db;">Alcohol:</span> <strong>${d.alcohol}</strong>`,
            event
          );
        })
        .on("mouseleave", hideTooltip)
        .on("mouseover", function (event, d) {
          d3.select(this).raise();
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", d.lung_cancer === "YES" ? 7 : 6)
            .attr("opacity", 1)
            .attr("stroke-width", 2.5);
        })
        .on("mouseout", function (event, d) {
          d3.select(this)
            .transition()
            .duration(150)
            .attr("r", d.lung_cancer === "YES" ? 5 : 4)
            .attr("opacity", 0.7)
            .attr("stroke-width", 1);
        });

      points
        .transition()
        .duration(800)
        .delay((d, i) => i * 2)
        .attr("r", d => d.lung_cancer === "YES" ? 5 : 4);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("g")
        .call(d3.axisLeft(y).ticks(8).tickFormat(d3.format("d")))
        .selectAll("text")
        .style("font-size", "11px");

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 50)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Age");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -70)
        .attr("text-anchor", "middle")
        .style("font-weight", 600)
        .style("font-size", "13px")
        .text("Number of Positive Symptoms");

      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 170}, -5)`);

      ["YES", "NO"].forEach((label, i) => {
        legend.append("circle")
          .attr("cx", 7)
          .attr("cy", i * 24 + 7)
          .attr("r", 7)
          .attr("fill", color(label))
          .attr("stroke", "#ffffff")
          .attr("stroke-width", 1.5);

        legend.append("text")
          .attr("x", 22)
          .attr("y", i * 24 + 11)
          .style("font-size", "12px")
          .style("font-weight", "500")
          .text(label === "YES" ? "Lung cancer = YES" : "Lung cancer = NO");
      });

      svg.append("text")
        .attr("x", 0)
        .attr("y", -10)
        .style("font-weight", 700)
        .style("font-size", "15px")
        .text("Age vs. Symptom Burden, Colored by Lung Cancer Status");
    })();

  }).catch(err => {
    console.error("Error loading CSV:", err);
  });
});
