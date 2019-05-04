angular.module('starterApp', ['ngMaterial']).config(function($mdThemingProvider, $mdIconProvider) {

    $mdThemingProvider.theme('default')
        .primaryPalette('indigo')
        .accentPalette('red');
});
