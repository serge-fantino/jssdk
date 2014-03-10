// deal with the cache-buster parameter
var cacheBuster = "";
if (document.location.href.indexOf("disable_cache_buster") < 0) {
    cacheBuster = "t=" + (new Date()).getTime();
}
var jssdk = jssdk || 'https://c9.io/squidsolutions/squid-jssdk/workspace';
require = {
    paths: {
        jssdk : jssdk,
        jquery : jssdk+'/js/jquery.min',
        jqueryui : jssdk+'/js/jquery-ui-1.8.24.custom.min',
        hbs: jssdk+'/js/hbs',
        'Handlebars' : 'Handlebars',
        underscore: jssdk+'/js/underscore-min',
        backbone: jssdk+'/js/backbone.1.1.0-min',
        d3 : jssdk+"/js/d3.v3.min"
    },
    shim: {
        'backbone': {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        },
        'underscore': {
            exports: '_'
        }
    },
    hbs: {
        templateExtension: 'hbs',
        // if disableI18n is `true` it won't load locales and the i18n helper
        // won't work as well.
        disableI18n: true
    },
    urlArgs: cacheBuster,
    waitSeconds : 30,
    config: {
        text: {
            useXhr: function(url, protocol, hostname, port) {
                // allow cross-domain requests
                // remote server allows CORS
                return true;
            }
        }
    }
};