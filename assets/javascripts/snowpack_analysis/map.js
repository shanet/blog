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
  initMap();
  initMapToggles();
});

function initMap() {
  map = L.map('map', {
    center: [48.291621, -121.239511],
    fullscreenControl: {pseudoFullscreen: true},
    maxBounds: [[52, -128], [43, -116]],
    zoom: 9,
  });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    minZoom: MIN_ZOOM,
    maxZoom: MAX_ZOOM,
    zIndex: 0,
  }).addTo(map);

  for(let i=0; i<LAYER_CONFIG.length; i++) {
    let layer_config = LAYER_CONFIG[i];

    let layer = L.tileLayer(`/assets/images/snowpack_analysis/tiles/${layer_config['name']}/{z}/{x}/{y}.png`, {
      minZoom: MIN_ZOOM,
      maxZoom: MAX_ZOOM,
      tms: false,
      bounds: [[48.885681, -122.990364], [46.003111, -119.913936]],
      zIndex: i + 1,
    });

    if(layer_config['default']) {
      layer.addTo(map);
    }

    LAYERS[layer_config['name']] = layer;
  }
}

function initMapToggles() {
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
