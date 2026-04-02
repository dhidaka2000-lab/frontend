// src/services/maps.js
// Google Maps JavaScript API の初期化ロジックを集約

import { getGoogleMapsUrl } from "./api.js";

let _mapsLoaded = false;
let _loadPromise = null;

/**
 * Google Maps API を動的にロードする（1回だけ）
 * @returns {Promise<void>}
 */
export async function loadGoogleMaps() {
  if (_mapsLoaded) return;
  if (_loadPromise)  return _loadPromise;

  _loadPromise = (async () => {
    const { mapUrl } = await getGoogleMapsUrl();

    await new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src   = mapUrl;
      script.async = true;
      script.defer = true;
      script.onload  = resolve;
      script.onerror = () => reject(new Error("Google Maps load failed"));
      document.head.appendChild(script);
    });

    _mapsLoaded = true;
  })();

  return _loadPromise;
}

/**
 * 地図を初期化して google.maps.Map インスタンスを返す
 * @param {HTMLElement} container
 * @param {{ lat: number, lng: number }} center
 * @param {number} zoom
 * @returns {google.maps.Map}
 */
export function createMap(container, center, zoom = 16) {
  return new google.maps.Map(container, {
    center,
    zoom,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
  });
}

/**
 * AdvancedMarkerElement を生成して地図に追加する
 * @param {google.maps.Map} map
 * @param {{ lat: number, lng: number }} position
 * @param {string} title
 * @returns {google.maps.marker.AdvancedMarkerElement}
 */
export function addMarker(map, position, title = "") {
  return new google.maps.marker.AdvancedMarkerElement({ map, position, title });
}

/**
 * KML テキストから KmlLayer を作成して地図に追加する
 * @param {google.maps.Map} map
 * @param {string}          kmlUrl  - R2 / Storage 上の KML URL
 * @returns {google.maps.KmlLayer}
 */
export function addKmlLayer(map, kmlUrl) {
  const layer = new google.maps.KmlLayer({
    url:             kmlUrl,
    map,
    preserveViewport: false,
  });
  return layer;
}
