const LAYER_CONFIG = [
  {name: 'hillshade', default: true},
  {name: 'lakes', default: true},
  {name: 'national_forests', default: false},
  {name: 'wilderness_areas', default: false},
  {name: 'roadless_areas', default: false},
  {name: 'highways', default: true},
  {name: 'forest_roads', default: false},
];

const LAYERS = {};
const MIN_ZOOM = 7;
const MAX_ZOOM = 13;

let map = null;

document.addEventListener('DOMContentLoaded', () => {
  initLandStatusMap();
  initLandStatusMapToggles();
  initStudyMap();
});

function initLandStatusMap() {
  map = L.map('land-status-map', {
    center: [48.291621, -121.239511],
    fullscreenControl: {pseudoFullscreen: true},
    maxBounds: [[52, -128], [43, -116]],
    zoom: 9,
  });

  getOpenStreetMapLayer().addTo(map);

  for(let i=0; i<LAYER_CONFIG.length; i++) {
    let layer_config = LAYER_CONFIG[i];
    let layer = getCustomTileMapLayer(layer_config['name'], i + 1);

    if(layer_config['default']) {
      layer.addTo(map);
    }

    LAYERS[layer_config['name']] = layer;
  }
}

function initStudyMap() {
  let map = L.map('study-map', {
    center: [48.291621, -121.239511],
    fullscreenControl: {pseudoFullscreen: true},
    maxBounds: [[52, -128], [43, -116]],
    zoom: 9,
  });

  getOpenStreetMapLayer().addTo(map);
  getCustomTileMapLayer('hillshade').addTo(map);

  const studyLocations = getStudyLocations();
  L.Icon.Default.prototype.options = {'imagePath': '/assets/javascripts/ski_area_study'};

  for(let i=0; i<studyLocations.length; i++) {
    let marker = L.marker(studyLocations[i]['coordinates']);
    marker.bindPopup(studyLocations[i]['name']);
    marker.addTo(map);
  }
}

function initLandStatusMapToggles() {
  let toggles = document.getElementsByClassName('map-toggle');

  for(let i=0; i<toggles.length; i++) {
    let toggle = toggles[i];

    toggle.addEventListener('click', () => {
      let layer = toggle.dataset.layer;

      if(toggle.classList.contains('inactive')) {
        map.addLayer(LAYERS[layer]);
      } else {
        map.removeLayer(LAYERS[layer]);
      }

      toggle.classList.toggle('inactive');
    });
  }
}

function getOpenStreetMapLayer() {
  return L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zIndex: 0,
  });
}

function getCustomTileMapLayer(name, zIndex=0) {
  return L.tileLayer(`https://raw.githubusercontent.com/shanet/Cascades-Ski-Area-Map/master/tiles/${name}/{z}/{x}/{y}.png`, {
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    tms: false,
    bounds: [[48.979952, -122.985703], [46.003111, -119.913936]],
    zIndex: zIndex,
  });
}

function getStudyLocations() {
  return [
    {
      'name': 'Glacier Basin',
      'recommendation': 'Study',
      'coordinates': [48.799876, -121.898223],
    },
    {
      'name': 'Schriebers Meadows',
      'recommendation': 'Study',
      'coordinates': [48.708709, -121.825220],
    },
    {
      'name': 'Cutthroat Pass',
      'recommendation': 'Study',
      'coordinates': [48.554838, -120.710998],
    },
    {
      'name': 'Sandy Butte',
      'recommendation': 'Study',
      'coordinates': [48.586541, -120.446986],
    },
    {
      'name': 'Tiffany Mountain',
      'recommendation': 'Study',
      'coordinates': [48.680076, -119.951150],
    },
    {
      'name': 'Twin Sisters',
      'recommendation': 'Reserve',
      'coordinates': [48.736667, -121.956366],
    },
    {
      'name': 'Marten Lake Basin',
      'recommendation': 'Reserve',
      'coordinates': [48.773071, -121.717056],
    },
    {
      'name': 'Gabrielhorn',
      'recommendation': 'Reserve',
      'coordinates': [48.605172, -120.839019],
    },
    {
      'name': 'Liberty Bell',
      'recommendation': 'Reserve',
      'coordinates': [48.513133, -120.668954],
    },
    {
      'name': 'Stormy Mountain',
      'recommendation': 'Reserve',
      'coordinates': [47.907738, -120.332968],
    },
    {
      'name': 'Dock Butte Basin',
      'recommendation': 'Eliminate',
      'coordinates': [48.627951, -121.822373],
    },
    {
      'name': 'Snowking-Found Creek',
      'recommendation': 'Eliminate',
      'coordinates': [48.452630, -121.279199],
    },
    {
      'name': 'Harts Pass',
      'recommendation': 'Eliminate',
      'coordinates': [48.714719, -120.668765],
    },
  ];
}
