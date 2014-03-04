// deal with the cache-buster parameter
var cacheBuster = "";
if (document.location.href.indexOf("disable_cache_buster") < 0) {
    cacheBuster = "t=" + (new Date()).getTime();
}

var require = {
    paths: {
        jquery: 'js/jquery.min',
        jqueryui : 'js/jquery-ui-1.8.24.custom.min',
        underscore: 'js/underscore-min',
        backbone: 'js/backbone-min',
        handlebars: 'js/handlebars-1.0.rc.2',
        hbs: 'js/hbs',
        i18nprecompile: 'js/i18nprecompile',
        json2: 'js/json2',
        templates: 'templates',
        d3 : "js/d3.v3.min"
    },
    hbs: {
        templateExtension: 'hbs',
        // if disableI18n is `true` it won't load locales and the i18n helper
        // won't work as well.
        disableI18n: true
    },
    urlArgs: cacheBuster,
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