const LAYER_CONFIG = {
  land_status: [
    {name: 'hillshade', default: true},
    {name: 'lakes', default: true},
    {name: 'national_forests', default: false},
    {name: 'wilderness_areas', default: false},
    {name: 'roadless_areas', default: false},
    {name: 'highways', default: true},
    {name: 'forest_roads', default: false},
  ],
  candidates: [
    {name: 'hillshade', default: true},
    {name: 'lakes', default: true},
    {name: 'national_forests', default: true},
    {name: 'wilderness_areas', default: true},
    {name: 'roadless_areas', default: true},
    {name: 'highways', default: true},
    {name: 'forest_roads', default: true},
    {name: 'slope', default: false},
  ],
};

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
  if(!document.getElementById('land-status-map')) return;

  map = L.map('land-status-map', {
    center: [48.291621, -121.239511],
    fullscreenControl: {pseudoFullscreen: true},
    maxBounds: [[52, -128], [43, -116]],
    zoom: 9,
  });

  getOpenStreetMapLayer().addTo(map);

  let layerConfigs = LAYER_CONFIG[document.getElementById('land-status-map').dataset.config];

  for(let i=0; i<layerConfigs.length; i++) {
    let layerConfig = layerConfigs[i];
    let layer = getCustomTileMapLayer(layerConfig['name'], i + 1);

    if(layerConfig['default']) {
      layer.addTo(map);
    }

    LAYERS[layerConfig['name']] = layer;
  }

  if(document.getElementById('land-status-map').dataset.config === 'candidates') {
    addMarkersToMap(map, getCandidateLocations());
  }
}

function initStudyMap() {
  if(!document.getElementById('study-map')) return;

  let map = L.map('study-map', {
    center: [48.291621, -121.239511],
    fullscreenControl: {pseudoFullscreen: true},
    maxBounds: [[52, -128], [43, -116]],
    zoom: 9,
  });

  getOpenStreetMapLayer().addTo(map);
  getCustomTileMapLayer('hillshade').addTo(map);

  addMarkersToMap(map, getStudyLocations());
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

function addMarkersToMap(map, markers) {
  L.Icon.Default.prototype.options = {'imagePath': '/assets/javascripts/ski_area_study'};

  for(let i=0; i<markers.length; i++) {
    let marker = L.marker(markers[i]['coordinates']);
    marker.bindPopup(`${markers[i]['name']}<br>${markers[i]['recommendation']}`);
    marker.addTo(map);
  }
}

function getStudyLocations() {
  return [
    {
      'name': 'Glacier Basin',
      'recommendation': 'Recommendation: Study',
      'coordinates': [48.799876, -121.898223],
    },
    {
      'name': 'Schriebers Meadows',
      'recommendation': 'Recommendation: Study',
      'coordinates': [48.708709, -121.825220],
    },
    {
      'name': 'Cutthroat Pass',
      'recommendation': 'Recommendation: Study',
      'coordinates': [48.554838, -120.710998],
    },
    {
      'name': 'Sandy Butte',
      'recommendation': 'Recommendation: Study',
      'coordinates': [48.586541, -120.446986],
    },
    {
      'name': 'Tiffany Mountain',
      'recommendation': 'Recommendation: Study',
      'coordinates': [48.680076, -119.951150],
    },
    {
      'name': 'Twin Sisters',
      'recommendation': 'Recommendation: Reserve',
      'coordinates': [48.736667, -121.956366],
    },
    {
      'name': 'Marten Lake Basin',
      'recommendation': 'Recommendation: Reserve',
      'coordinates': [48.773071, -121.717056],
    },
    {
      'name': 'Gabrielhorn',
      'recommendation': 'Recommendation: Reserve',
      'coordinates': [48.605172, -120.839019],
    },
    {
      'name': 'Liberty Bell',
      'recommendation': 'Recommendation: Reserve',
      'coordinates': [48.513133, -120.668954],
    },
    {
      'name': 'Stormy Mountain',
      'recommendation': 'Recommendation: Reserve',
      'coordinates': [47.907738, -120.332968],
    },
    {
      'name': 'Dock Butte Basin',
      'recommendation': 'Recommendation: Eliminate',
      'coordinates': [48.627951, -121.822373],
    },
    {
      'name': 'Snowking-Found Creek',
      'recommendation': 'Recommendation: Eliminate',
      'coordinates': [48.452630, -121.279199],
    },
    {
      'name': 'Harts Pass',
      'recommendation': 'Recommendation: Eliminate',
      'coordinates': [48.714719, -120.668765],
    },
  ];
}

function getCandidateLocations() {
  return [
    {
      'name': 'Mt. Baker NRA',
      'recommendation': 'Purpose: Ski area',
      'coordinates': [48.708709, -121.825220],
    },
    {
      'name': 'Snowking',
      'recommendation': 'Purpose: Ski area',
      'coordinates': [48.408197, -121.278212],
    },
    {
      'name': 'White Chuck',
      'recommendation': 'Purpose: Ski area',
      'coordinates': [48.222119, -121.442192],
    },
    {
      'name': 'Cutthroat Pass',
      'recommendation': 'Purpose: Ski area',
      'coordinates': [48.554838, -120.710998],
    },
    {
      'name': 'Rock Mountain',
      'recommendation': 'Purpose: Ski area',
      'coordinates': [47.799528, -120.974452],
    },
    {
      'name': 'Sloan Peak',
      'recommendation': 'Purpose: Ski area',
      'coordinates': [48.059256, -121.341993],
    },
        {
      'name': 'Yodelin',
      'recommendation': 'Purpose: Ski area',
      'coordinates': [47.769241, -121.068829],
    },
    {
      'name': 'Hidden Lake',
      'recommendation': 'Purpose: Limited access ski area',
      'coordinates': [48.500862, -121.197703],
    },
    {
      'name': 'Mt. Pilchuck',
      'recommendation': 'Purpose: Backcountry access',
      'coordinates': [48.058051, -121.797954],
    },
    {
      'name': 'Skyline Divide',
      'recommendation': 'Purpose: Backcountry access',
      'coordinates': [48.868689, -121.850193],
    },
    {
      'name': 'Twin Lakes',
      'recommendation': 'Purpose: Backcountry access',
      'coordinates': [48.952026, -121.635441],
    },
    {
      'name': 'Cayuse Pass',
      'recommendation': 'Purpose: Backcountry access',
      'coordinates': [46.866889, -121.538631],
    },
  ]
}
