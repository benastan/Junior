Junior
======

#### An MVC Javascript Framework ####

Junior (Jr), named for its use of jQuery (j) and RequireJS (R), is an ajax-driven, 
object-oriented javascript framework and templating system that hopes to refocus
web applications onto the front-end as the axis of control. Junior is an experiment
in reducing back-end code to the most basic database reads and writes by treating
all content as a web service.

### Setup ###

With Junior, URL routes are handled by the Jr.monitor method. When Junior notices
that the state of the app has changed, it uses RequireJS to load controller
corresponding to changes in the URI.

To get started, add the following `<script>` tag to your head:

		<script type="text/javascript" src="scripts/require-jquery.js" data-main="scripts/core/init.js"></script>

This will load RequireJS, using Junior's `init.js` as it's `data-main` file. From there, Junior will attempt
to load a controller based on the route. If there is no route, Junior will look in your config file for a
`default_controller` property, and load that controller instead. If Junior finds an `init_controller` it will load that controller prior to loading any state-based controllers. (More on config files later.)

### The `app` folder ###

When developing an app, you're done with the `core` folder as soon as `require-jquery.js` and `init.js` are loaded. You'll spend almost all of your development time in the `app` folder.

The `app` folder is set up like so:

		/app/c
		/app/lib
		/app/m
		/app/v

The `c`, `m` and `v` folders correspond to controllers, models and view. The `lib` folder contains libraries that are used by one or more controller, model or view.
