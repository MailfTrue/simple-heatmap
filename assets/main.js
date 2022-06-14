const CSVToArray = (data, delimiter = ";", omitFirstRow = false) =>
  data
    .slice(omitFirstRow ? data.indexOf("\n") + 1 : 0)
    .split("\n")
    .map((v) => v.split(delimiter).map((x) => x.trim()));

function updateURLParameter(param, paramVal) {
  const search = window.location.search;
  var regex = new RegExp("([?;&])" + param + "[^&;]*[;&]?");
  var query = search.replace(regex, "$1").replace(/&$/, "");

  window.history.replaceState(
    "",
    "",
    window.location.pathname +
      ((query.length > 2 ? query + "&" : "?") +
        (paramVal ? param + "=" + paramVal : ""))
  );
}

function getQueryVariable(variable) {
  let query = window.location.search.substring(1);
  let vars = query.split("&");
  for (let i = 0; i < vars.length; i++) {
    let pair = vars[i].split("=");
    if (decodeURIComponent(pair[0]) == variable) {
      return decodeURIComponent(pair[1]);
    }
  }
}

function getDataFromCSV(text) {
  const csvData = CSVToArray(text).slice(1);
  return csvData.map((x) => [parseFloat(x[0]), parseFloat(x[1])]);
}

async function getQueryLayers() {
  const files = getQueryVariable("files");
  if (!files) return [];
  const layers = [];
  console.log(files);
  for (let file of files.split(";")) {
    console.log(file);
    const response = await fetch(file);
    const fullFileName = file.substring(file.lastIndexOf("/") + 1);
    console.log(fullFileName);
    let userFileName =
      fullFileName.match(
        /^[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}_(?<name>.*)$/
      )?.groups?.name || fullFileName;

    console.log("ads", userFileName);
    layers.push({
      enabled: true,
      name: userFileName,
      path: file,
      data: getDataFromCSV(await response.text())
    });
  }
  console.log(layers);
  return layers;
}

ymaps.ready(["Heatmap"]).then(async function init() {
  const queryCenter = getQueryVariable("center");
  const myMap = new ymaps.Map("map", {
    center: queryCenter
      ? queryCenter.split(",").map(parseFloat)
      : [55.733835, 37.588227],
    zoom: getQueryVariable("zoom") || 11,
    controls: []
  });

  myMap.events.add(["boundschange"], function (e) {
    if (e.get("type") === "boundschange") {
      updateURLParameter("center", e.get("newCenter").join(","));
      updateURLParameter("zoom", e.get("newZoom"));
    }
  });

  const hetmapConfig = {
    radius: 15,
    dissipating: false,
    opacity: 0.8,
    intensityOfMidpoint: 0.2,
    gradient: {
      0.1: "rgba(128, 255, 0, 0.7)",
      0.2: "rgba(255, 255, 0, 0.8)",
      0.7: "rgba(234, 72, 58, 0.9)",
      1.0: "rgba(162, 36, 25, 1)"
    }
  };

  let layers = await getQueryLayers();
  var heatmap = new ymaps.Heatmap([], hetmapConfig);
  heatmap.setMap(myMap);

  const controls = document.querySelector("#controls");
  const layersEl = controls.querySelector("#layers");
  function render() {
    let data = [];
    for (let layerData of layers.filter((x) => x.enabled).map((x) => x.data))
      data = [...data, ...layerData];
    heatmap.setData(data);

    layersEl.innerHTML = "";
    for (let layerId = 0; layerId < layers.length; layerId += 1) {
      const checkboxId = `layer_${layerId}`;
      const input = document.createElement("input");
      input.setAttribute("type", "checkbox");
      input.setAttribute("id", checkboxId);
      if (layers[layerId].enabled) input.setAttribute("checked", "");
      input.addEventListener("change", (event) => {
        layers[layerId].enabled = event.target.checked;
        render();
      });

      const label = document.createElement("label");
      label.setAttribute("for", checkboxId);
      label.innerText = layers[layerId].name;

      const inputDiv = document.createElement("div");
      inputDiv.appendChild(input);
      inputDiv.appendChild(label);
      layersEl.appendChild(inputDiv);
    }
  }

  const fileSelect = document.querySelector("#file");
  fileSelect.addEventListener("change", function (event) {
    const fileList = event.target.files;
    for (let file of fileList) {
      file.text().then(async (text) => {
        let data = getDataFromCSV(text);

        let formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/upload", {
          method: "POST",
          body: formData
        });

        const filePath = (await response.json()).path;
        layers.push({
          enabled: true,
          data,
          name: file.name,
          path: filePath
        });

        updateURLParameter("files", layers.map((x) => x.path).join(";"));

        render();
        event.target.value = null;
      });
    }
  });

  render();
});
