//TODO:
// 1. hamburger with a "navbar"?

var $ = require('jquery')
var ko = require('knockout')

var Poi = function (data) {
  this.id = ko.observable(data.id)
  this.name = ko.observable(data.name)
  this.marker = ko.observable(data.marker)
}

var ViewModel = function () {

  var self = this
  self.poiList = ko.observableArray([])
  self.addressEntered = ko.observable()
  self.filter = ko.observable('')

  self.search = function () {
    var addressEntered = self.addressEntered()
    addressEntered ? initMap(addressEntered) : alert('You did not enter a value')
  }

  self.filteredItems = ko.computed(function() {
    var filter = self.filter().toLowerCase()
    if (!filter) {
      return self.poiList()
    } else {
      return ko.utils.arrayFilter(self.poiList(), function(item) {
        var foundItem = ko.utils.stringStartsWith(item.name().toLowerCase(), filter)
        foundItem ? item.marker().setVisible(true) : item.marker().setVisible(false)
        return foundItem
      })
    }
  }, self)

  self.filteredMarkers = ko.computed(function () {
    var entries = self.filteredItems()
  })

  var geocoder, map, infoWindow

  self.initMap = function (addressEntered) {

    self.poiList([])

    infoWindow = new google.maps.InfoWindow;

    if (!addressEntered) {
      // Try HTML5 geolocation.
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(function(position) {
          var pos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };

          self.makeMap(pos, 'Your location')
        }, function() {
          handleLocationError(true, infoWindow, map.getCenter())
        });
      } else {
        // Browser doesn't support Geolocation
        handleLocationError(false, infoWindow, map.getCenter())
      }
    } else {

      // Get latlng using addressEntered
      geocoder = new google.maps.Geocoder()
      geocoder.geocode({
          'address': addressEntered
      }, function(results, status) {
          if (status == google.maps.GeocoderStatus.OK) {
            var pos = results[0].geometry.location
            makeMap(pos)
          } else {
            alert('Google Maps could not determine your location at this time')
          }
      })
    }
  }

  self.makeMap = function (pos, content) {
    self.setMap(pos)
    self.setInfoWindow(content, pos)
    self.getPlaces(pos)
  }

  self.setMap = function (pos) {
    map = new google.maps.Map(document.getElementById('map'), {
      center: pos,
      zoom: 15
    })
  }

  self.setInfoWindow = function (content, pos, map) {
    infoWindow.setPosition(pos);
    infoWindow.setContent('Your location.');
    infoWindow.open(map);
  }

  self.getPlaces = function (pos) {
    $.ajax({
      type: 'GET',
      url: `https://api.foursquare.com/v2/venues/search?ll=${Math.round(pos.lat*100)/100},${Math.round(pos.lng*100)/100}&client_id=UOG4ZZ1LWVMTRZJQAW2STDMA5BYOLGK3YJRGAQJBJON2JKMN&client_secret=OLR5JFDG3OV3JNPHZ14RXDD55WFMQ21HD5SXAWOJCVOH1LGB&v=20170418`,
      success: function (results) {
        // console.log(results.response.venues)
        self.callback(results.response.venues)
      },
      error: function (error) {
        alert('Point of Interest data could not be loaded at this time.')
      }
    })
  }

  // callback for foursquare API
  self.callback = function (results) {

    results.forEach( function(place) {
      var marker = self.createMarker(place)
      place.marker = marker
      self.poiList.push(new Poi(place))

      // add mouseover effect on entry-marker
      google.maps.event.addDomListener(document.getElementById(place.id), 'mouseover', function () {
        place.marker.setIcon('http://maps.gstatic.com/mapfiles/markers2/icon_green.png')
      })
      // add mouseover effect on entry-marker
      google.maps.event.addDomListener(document.getElementById(place.id), 'mouseout', function () {
        place.marker.setIcon('http://maps.gstatic.com/mapfiles/markers2/marker.png')
      })

      // add click effect on entry-marker
      var entry = document.getElementById(place.id)
      google.maps.event.addDomListener(entry, 'click', function () {

        google.maps.event.trigger(place.marker, 'click');

        // toggle text highlighting (white)
        entries = document.querySelectorAll('.active');
        if(entries.length) entries[0].className = ''
        entry.className = 'active'
      })
    })
  }

  self.createMarker = function (place) {
      var marker = new google.maps.Marker({
        map: map,
        position: { lat: place.location.lat, lng: place.location.lng}
      });

      google.maps.event.addListener(marker, 'click', function() {
        var contentString = `<h2>${place.name}</h1>\n<h4>${place.categories[0].name}</h4>\n<p>${place.location.formattedAddress}</h3>`
        infoWindow.setContent(contentString);
        infoWindow.open(map, this);
      });

      return marker;
  }
}

// my is the exposed variable that can be accessed from the html
my = { viewModel: new ViewModel() };
ko.applyBindings(my.viewModel);
window.initMap = my.viewModel.initMap;
window.handleScriptError = function (error) {
  alert('Google Maps could not be loaded at this time.')
}
