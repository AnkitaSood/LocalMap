var localMapApp = (function () {
    var latitude, longitude, latlng, map;
    var initMap = function () {
        var mapDiv = document.getElementById('map-canvas');

        function showLocalMap(position) {
            if (position === undefined) {
                localMapApp.latitude = 40.7058316;
                localMapApp.longitude = -74.2581961;
            } else {
                localMapApp.latitude = position.coords.latitude;
                localMapApp.longitude = position.coords.longitude;
            }
            localMapApp.latlng = new google.maps.LatLng(localMapApp.latitude, localMapApp.longitude);
            localMapApp.map = new google.maps.Map(mapDiv, {
                center: localMapApp.latlng,
                zoom: 11,
                disableDefaultUI: true,
                mapTypeId: google.maps.MapTypeId.ROADMAP
            });
            /*Applying bindings and load data once position has been retrieved*/
            google.maps.event.addListenerOnce(localMapApp.map, 'idle', function () {
                ko.applyBindings(viewModel);
                viewModel.fetchVenues();
            });
        }

        function errorHandler(err) {
            if (err.code == 1) {
                alert('Error: Access is denied! Kindly allow your location to be shared and try again!');
            } else if (err.code == 2) {
                alert('Unable to retrieve your current location! Presenting the local map of NYC');
                showLocalMap();
            }
        }

        function getLocation() {
            var options = {
                timeout: 60000,
                maximumAge: 35000
            };
            navigator.geolocation.getCurrentPosition(showLocalMap, errorHandler, options);
        }
        if (navigator.geolocation) {
            getLocation();
        } else {
            alert('Sorry, browser does not support geolocation!');
        }
    };
    return {
        initMap: initMap
    }
})();
var Venue = function (venue) {
    venue.currWeather = ko.observable();
    venue.currTemp = ko.observable();
    venue.currWind = ko.observable();
    venue.weatherIcon = ko.observable();
    venue.displayDetails = ko.observable(false);
    venue.position = new google.maps.LatLng(venue.location.lat, venue.location.lng);
    venue.marker = new google.maps.Marker({
        position: venue.position,
        map: localMapApp.map,
        animation: google.maps.Animation.DROP,
        title: venue.name
    });
    venue.infowindow = new google.maps.InfoWindow({
        maxWidth: 300
    });
}
var viewModel = new function () {
    var self = this;
    self.category = ko.observableArray(CATEGORIES);
    self.selectedCatKey = ko.observable();
    self.venueSuggestions = ko.observable(false);
    self.showResults = ko.observable(false);
    self.limit = ko.observable(25);
    self.venues = ko.observableArray([]);
    self.venuesList = ko.observableArray([]);
    self.markersArr = ko.observableArray([]);
    self.toggleResults = function (data, event) {
        self.showResults(!self.showResults());
    }
    self.filterList = function (selectedCatName, selectedCatKey) {
        if (selectedCatName === 'All') {
            self.limit = ko.observable(25);
        } else {
            self.limit = ko.observable(5);
        }
        self.fetchVenues(selectedCatKey);
    };
    self.resetMarkers = function () {
        /*Reset markers for every search*/
        if (self.markersArr().length !== 0) {
            $.each(self.markersArr(), function (i, marker) {
                marker.setMap(null);
            });
        }
    };
    self.fetchVenues = function (selectedCatKey) {
        var venues,
            latlong = localMapApp.latitude + ',' + localMapApp.longitude,
            marker, currMarker, markerContentStr,
            bounds = new google.maps.LatLngBounds(),
            infowindow,
            service = new google.maps.places.PlacesService(localMapApp.map),
            request, venueImgUrl;
        /* Display venues from all categories, on page load */
        if (selectedCatKey === undefined) {
            selectedCatKey = '';
            $.each(self.category(), function (i, category) {
                selectedCatKey += category.key + ',';
            });
            //Remove the last comma that gets appended while concatenating the keys
            selectedCatKey = selectedCatKey.slice(0, -1);
        };
        self.selectedCatKey(selectedCatKey);
        $.getJSON({
            url: encodeURI('https://api.foursquare.com/v2/venues/search?ll=' + latlong + '&categoryId=' + selectedCatKey + '&limit=' + self.limit() + '&intent=browse&radius=8000&client_id=XK2FF2P2QZZSB1HPAFQFC1VEBRUM0AYXKVSB3G14MN3IXMLT&client_secret=S5MD24CPFUC2TXWRSKW1URKHWJ1JAD44E4XMQO5LWWZJHOS5&v=20160419')
        }).done(function (data) {
            venues = data.response.venues;
            ko.utils.arrayMap(venues, function (venue) {
                return new Venue(venue);
            });
            self.venues(venues);
            self.resetMarkers();
            $.each(self.venues(), function (i, venue) {
                /*Create markers for all venues*/
                marker = venue.marker;
                infowindow = venue.infowindow;
                self.markersArr.push(marker);
                bounds.extend(marker.position);
                /*Fetch venue image to display inside infowindow of each marker & append to marker content */
                var makeInfoWindow = function (results, status) {
                        markerContentStr = '';
                        if (status == google.maps.places.PlacesServiceStatus.OK && results[0].photos !== undefined) {
                            venueImgUrl = results[0].photos[0].getUrl({
                                'maxWidth': 250,
                                'maxHeight': 150
                            });
                        } else {
                            venueImgUrl = './css/images/image-not-found.png';
                        }
                        markerContentStr = '<div id="markerContent">' + '<img src=' + venueImgUrl + ' alt="Venue Image"/>' + '<h5>' + venue.name + '</h5>' + '<p>Category: ' + venue.categories[0].name + '</p>';
                        infowindow.setContent(markerContentStr);
                    }
                    /*Request to fetch venue image*/
                request = {
                    location: venue.position,
                    radius: '100',
                    keyword: venue.name
                };
                /*On click of marker - toggle marker, call makeInfoWindow and display infowindow content*/
                var markerMagic = function (request, makeInfoWindow, marker) {
                    return function () {
                        service.nearbySearch(request, makeInfoWindow);
                        currMarker = marker;
                        currMarker.setAnimation(google.maps.Animation.BOUNCE);
                        localMapApp.map.panTo(marker.getPosition());
                        localMapApp.map.setZoom(18);
                        if (!venue.displayDetails()) {
                            self.displayVenueDetails(venue.location.postalCode, venue);
                        };
                        infowindow.open(localMapApp.map, marker);
                    }
                }
                google.maps.event.addListener(marker, 'click', markerMagic(request, makeInfoWindow, marker));
                google.maps.event.addListener(infowindow, 'closeclick', function () {
                    currMarker.setAnimation(null);
                });
            });
            //Create list of venues to be shown as autosuggest for search textbox
            self.venuesList($.map(self.venues(), function (venue) {
                return {
                    label: venue.name,
                    id: venue.id
                }
            }));

            $('.venue-search').autocomplete({
                source: self.venuesList(),
                autoFocus: true,
                minLength: 2,
                select: function (event, ui) {
                    self.venues(venues);
                    //self.resetMarkers();
                    $.each(self.venues(), function (i, venue) {
                        if (venue.id === ui.item.id) {
                            self.venues(venue);
                            marker = venue.marker;
                            infowindow = venue.infowindow;
                            self.markersArr.push(marker);
                            bounds.extend(marker.position);
                            localMapApp.map.setCenter(marker.position);
                            self.displayVenueDetails(venue.location.postalCode, venue);
                            self.showResults(true);
                            return false;
                        }
                    })
                },
                response: function (event, ui) {
                    if (ui.content.length === 0) {
                        self.venueSuggestions(true);
                    } else {
                        self.venueSuggestions(false);
                    }
                }
            });
            localMapApp.map.fitBounds(bounds);
        });
    };

    self.displayVenueDetails = function (zipcode, sender) {
        /*Toggle venue details when selected*/
        sender.displayDetails(!sender.displayDetails());
        if (sender.displayDetails()) {
            google.maps.event.trigger(sender.marker, 'click');
            /*Fetch venue weather details*/
            $.getJSON({
                url: encodeURI('http://api.openweathermap.org/data/2.5/weather?zip=' + zipcode + '&APPID=3ba479c50b70ef8527458684a4df9608&units=metric')
            }).done(function (data) {
                localStorage.weatherCache = JSON.stringify({
                    timestamp: (new Date()).getTime(), // getTime() returns milliseconds
                    data: data
                });
                sender.currWeather(data.weather[0].description);
                sender.currTemp(data.main.temp);
                sender.currWind(data.wind.speed);
                sender.weatherIcon('http://openweathermap.org/img/w/' + data.weather[0].icon + '.png');
            });
        }
    };
};