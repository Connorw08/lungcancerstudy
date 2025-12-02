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
    const margin = { top: 30, right: 20, bottom: 60, left: 70 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const makeSvg = (selector) => {
      return d3.select(selector)
        .append("svg")
        .attr("viewBox", `0 0 ${width} ${height}`)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);
    };
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "tooltip");
    const showTooltip = (html, event) => {
      tooltip
        .html(html)
        .style("left", (event.pageX + 12) + "px")
        .style("top", (event.pageY - 28) + "px")
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

    // CHART 1: Overall lung cancer prevalence 
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
      svg.selectAll(".bar-prevalence")
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-prevalence")
        .attr("x", d => x(d.status))
        .attr("y", d => y(d.count))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.count))
        .attr("fill", "#0f172a")
        .attr("opacity", 0.85)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>${d.status}</strong><br>
             Count: ${d.count}<br>
             Share of sample: ${(d.pct * 100).toFixed(1)}%`,
            event
          );
        })
        .on("mouseleave", hideTooltip);
      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));
      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Lung Cancer Status");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Number of Individuals");
    })();
    // CHART 2: Age distribution by lung cancer status
    (function drawAgeHistogram() {
      const svg = makeSvg("#chart-age");

      const ages = data.map(d => d.age);
      const x = d3.scaleLinear()
        .domain(d3.extent(ages)).nice()
        .range([0, innerWidth]);

      const binsYes = d3.bin()
        .domain(x.domain())
        .thresholds(10)(
          data.filter(d => d.lung_cancer === "YES").map(d => d.age)
        );

      const binsNo = d3.bin()
        .domain(x.domain())
        .thresholds(10)(
          data.filter(d => d.lung_cancer === "NO").map(d => d.age)
        );

      const maxCount = d3.max([
        d3.max(binsYes, d => d.length),
        d3.max(binsNo, d => d.length)
      ]);

      const y = d3.scaleLinear()
        .domain([0, maxCount]).nice()
        .range([innerHeight, 0]);

      const barWidth = (innerWidth / binsYes.length) / 2;
      svg.selectAll(".bar-age-yes")
        .data(binsYes)
        .enter()
        .append("rect")
        .attr("class", "bar-age-yes")
        .attr("x", d => x(d.x0) + 2)
        .attr("y", d => y(d.length))
        .attr("width", barWidth - 4)
        .attr("height", d => innerHeight - y(d.length))
        .attr("fill", "#0f172a")
        .attr("opacity", 0.75)
        .on("mousemove", (event, d) => {
          if (!d.length) return;
          showTooltip(
            `<strong>YES</strong><br>
             Age: ${d.x0}–${d.x1}<br>
             Count: ${d.length}`,
            event
          );
        })
        .on("mouseleave", hideTooltip);
      svg.selectAll(".bar-age-no")
        .data(binsNo)
        .enter()
        .append("rect")
        .attr("class", "bar-age-no")
        .attr("x", d => x(d.x0) + barWidth + 2)
        .attr("y", d => y(d.length))
        .attr("width", barWidth - 4)
        .attr("height", d => innerHeight - y(d.length))
        .attr("fill", "#9ca3af")
        .attr("opacity", 0.85)
        .on("mousemove", (event, d) => {
          if (!d.length) return;
          showTooltip(
            `<strong>NO</strong><br>
             Age: ${d.x0}–${d.x1}<br>
             Count: ${d.length}`,
            event
          );
        })
        .on("mouseleave", hideTooltip);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y));

      // Axis labels
      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Age");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -50)
        .attr("text-anchor", "middle")
        .text("Number of Individuals");

      // Legend
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 130}, 0)`);

      legend.append("rect")
        .attr("x", 0).attr("y", 0)
        .attr("width", 14).attr("height", 14)
        .attr("fill", "#0f172a");

      legend.append("text")
        .attr("x", 20).attr("y", 11)
        .text("Lung cancer = YES")
        .style("font-size", "12px");

      legend.append("rect")
        .attr("x", 0).attr("y", 20)
        .attr("width", 14).attr("height", 14)
        .attr("fill", "#9ca3af");

      legend.append("text")
        .attr("x", 20).attr("y", 31)
        .text("Lung cancer = NO")
        .style("font-size", "12px");
    })();

    // CHART 3: Lung cancer rate by gender 
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

      svg.selectAll(".bar-gender")
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-gender")
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.rate))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.rate))
        .attr("fill", "#0f172a")
        .attr("opacity", 0.85)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>Gender: ${d.key}</strong><br>
             Lung cancer: ${(d.rate * 100).toFixed(1)}%<br>
             YES: ${d.cancerYes} / Total: ${d.total}`,
            event
          );
        })
        .on("mouseleave", hideTooltip);

      // Axes
      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d * 100 + "%"));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Gender");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .text("Lung Cancer Rate");
    })();

    function drawBinaryRiskChart(containerSelector, label) {
      const svg = makeSvg(containerSelector);

      const rows = rateByCategory(data, d => d[label]);

      const x = d3.scaleBand()
        .domain(rows.map(d => d.key))
        .range([0, innerWidth])
        .padding(0.4);

      const y = d3.scaleLinear()
        .domain([0, 1]).nice()
        .range([innerHeight, 0]);

      svg.selectAll(".bar-bin-" + label)
        .data(rows)
        .enter()
        .append("rect")
        .attr("class", "bar-bin-" + label)
        .attr("x", d => x(d.key))
        .attr("y", d => y(d.rate))
        .attr("width", x.bandwidth())
        .attr("height", d => innerHeight - y(d.rate))
        .attr("fill", "#0f172a")
        .attr("opacity", 0.85)
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>${label}: ${d.key}</strong><br>
             Lung cancer: ${(d.rate * 100).toFixed(1)}%<br>
             YES: ${d.cancerYes} / Total: ${d.total}`,
            event
          );
        })
        .on("mouseleave", hideTooltip);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d * 100 + "%"));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text(label + " (Yes / No)");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .text("Lung Cancer Rate");
    }

    // CHART 4: Lung cancer rate by smoking 
    (function drawSmoking() {
      // we stored smoking as "Yes"/"No" in data.smoking
      drawBinaryRiskChart("#chart-smoking", "smoking");
    })();

    // CHART 5: Lung cancer rate by alcohol use 
    (function drawAlcohol() {
      drawBinaryRiskChart("#chart-alcohol", "alcohol");
    })();

    // CHART 6: Symptom count vs lung cancer probability 
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

      const line = d3.line()
        .x(d => x(d.count))
        .y(d => y(d.rate));

      svg.append("path")
        .datum(rows)
        .attr("fill", "none")
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 2)
        .attr("d", line);

      svg.selectAll(".sym-dot")
        .data(rows)
        .enter()
        .append("circle")
        .attr("class", "sym-dot")
        .attr("cx", d => x(d.count))
        .attr("cy", d => y(d.rate))
        .attr("r", 4)
        .attr("fill", "#0f172a")
        .on("mousemove", (event, d) => {
          showTooltip(
            `<strong>Symptoms: ${d.count}</strong><br>
             Lung cancer: ${(d.rate * 100).toFixed(1)}%<br>
             YES: ${d.yes} / Total: ${d.total}`,
            event
          );
        })
        .on("mouseleave", hideTooltip);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x).ticks(rows.length).tickFormat(d3.format("d")));

      svg.append("g")
        .call(d3.axisLeft(y).tickFormat(d => d * 100 + "%"));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Number of Positive Symptoms / Risk Flags");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .text("Lung Cancer Rate");
    })();

    // CHART 7: Age vs symptom count scatterplot 
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
        .range(["#0f172a", "#9ca3af"]);

      svg.selectAll(".point-age-sym")
        .data(data)
        .enter()
        .append("circle")
        .attr("class", "point-age-sym")
        .attr("cx", d => x(d.age))
        .attr("cy", d => y(d.symptomCount))
        .attr("r", 3)
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
        .on("mouseleave", hideTooltip);

      svg.append("g")
        .attr("transform", `translate(0,${innerHeight})`)
        .call(d3.axisBottom(x));

      svg.append("g")
        .call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("d")));

      svg.append("text")
        .attr("x", innerWidth / 2)
        .attr("y", innerHeight + 40)
        .attr("text-anchor", "middle")
        .text("Age");

      svg.append("text")
        .attr("transform", "rotate(-90)")
        .attr("x", -innerHeight / 2)
        .attr("y", -55)
        .attr("text-anchor", "middle")
        .text("Number of Positive Symptoms");
      const legend = svg.append("g")
        .attr("transform", `translate(${innerWidth - 130}, 0)`);

      ["YES", "NO"].forEach((label, i) => {
        legend.append("circle")
          .attr("cx", 0)
          .attr("cy", i * 20)
          .attr("r", 5)
          .attr("fill", color(label));

        legend.append("text")
          .attr("x", 12)
          .attr("y", i * 20 + 4)
          .style("font-size", "12px")
          .text(label === "YES" ? "Lung cancer = YES" : "Lung cancer = NO");
      });
    })();
  });
});
