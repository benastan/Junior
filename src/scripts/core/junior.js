// Grab the config.js file, containing
// the configuration object.
define(["../app/config"], function(config, Tools) {
	
	var 
			// Jr declare Junior namespace
			Jr = {
				load: {},
				render: {}
			},
			defaults = {
				default_controller: 'index',
				jr_events_target: 'body'
			};

			config = $.extend(defaults, config);
			
			// Utility functions lib and css.
			// Available whenever Jr is running.
			// lib: returns uri for requiring libraries.
	Jr.utilities = {
		lib: function(str) {
			return "../../lib/"+str;
		},

		// Jr.utilities.css
		// Builds url and appends stylesheets to head.
		// @str: name of stylesheet
		// @abs: 
		css: function(d, h) {
			return function(stylesheetName, isAbsolute) {
				if ((!isAbsolute) && config.css_path) {
					stylesheetName = config.css_path + stylesheetName + '.css';
				}
				var s = d.createElement('link');
				$.extend(s, {
					href: stylesheetName,
					type: 'text/css',
					rel: 'stylesheet'
				});
				h.appendChild(s);
			}
		}(document, document.getElementsByTagName('head')[0])
	};

	// Add lib and css to window.
	$.extend(window, Jr.utilities);

	// Array of HTMLAnchorElements to be
	// excepted from the Jr.goto function.
	Jr.aExceptions = [];

	// Finds the <script> tag that includes
	//
	Jr.getNamespace = function() {
		var pos;
		$('script').each(function() {
			pos = this.src.indexOf('require-jquery');
			if (pos !== -1) {
				namespace = this.src.substr(0, pos)+'../app';
			}
		});				
		return namespace;
	}

	Jr.Object = function() {
		arguments = arguments[0];
		var numargs = arguments.length;
		this.name = arguments[0];
		this.callback = numargs < 2 ? false : arguments[1];
		this.cache = numargs < 3 ? true : arguments[2];
		return this;
	}

	Jr.Model = function() {
		Jr.Object.call(this, arguments);
		var numargs = arguments.length,
				settings = {
					type: 'get',
					url: Jr.getNamespace() + '/m/' + this.name + '.json',
					dataType: 'json'
				},
				response,
				callback = this.callback;
		if (numargs === 1 && typeof arguments[0] === 'object') {
			this.setData(arguments[0]);
			return this;
		}
		if (callback && typeof callback === 'function') {
			callback = function(model, callback) {
				return function(response) {
					model.setData(response);
					callback.apply(model);
				}
			}(this, callback);
			settings.async = true;
			settings.success = callback;
		} else {
			callback = false;
			settings.async = false;
		}
		response = $.ajax(settings);
		if (!settings.async) {
			this.setData(response.responseText);
		}
		return this;	
	}

	Jr.Model.prototype.setData = function(data, cache) {
		try {
			if (typeof data !==  'object') {
				data = $.parseJSON(data);
			}
		} catch (e) {
			console.log(e);
			return false;
		}
		this.data = this.data || [];
		var now = new Date().getTime();
		if (data) {
			this.data.push({
				time: now,
				data: data
			});
		}
		if (!cache) {
			cache = typeof data === 'number' ? data : now;
		}
		if (!this.data.length) {
			return {};
		}
		for (i in this.data) {
			if (this.data[i].time === cache) {
				return this.data[i].data;
			}
		}
		return this.data[this.data.length - 1].data
	}
	
	Jr.View = function() {
		Jr.Object.call(this, arguments);
		if (typeof this.name === 'string') {
			require(['../app/v/' + this.name], function(view) {
				return function(response) {
					view.setData(response);
					if (typeof view.callback === 'function') {
						view.callback();
					}
				}
			}(this));
		} else if (typeof this.name === 'object') {
			this.setData(this.name);
		}
	}

	Jr.View.prototype.setData = function(data) { 
		if (typeof data !== 'undefined') {
			this.data = data;	
		}
		/*if (typeof this.data.template === 'string') {
			this.data.template = $(this.data.template); 
			if (!$(document).has(this.data.template)) {
				this.data.template = this.data.template.clone()
			}
		}*/
		return this.data;
	}
	
	Jr.View.prototype.render = function(model, cb) {
		if (typeof model === 'string') {
			model = new Jr.Model(model);
		} else if (!model instanceof Jr.Model) {
			return false;
		}
		return new Jr.ViewModel(this, model).render(cb);
	}

	// Object that combines a view and a model.
	Jr.ViewModel = function(view, model) {
		this.view = view;
		this.model = model;
	}
	
	// Does the work of rendering a Jr.ViewModel
	Jr.ViewModel.prototype.render = function(cb) {
		var 
				// Get the template from the view.
				parent_template = this.view.data.template,

				// Get the map from the view.
				map = this.view.data.map,

				// We make use of undefined, so make it
				// local.
				undefined,

				// Get model.
				data = this.model,

				// Variables we're going to use.
				map_key,
				data_key,
				current_data,
				current_map,
				template_match,
				selector,
				attr,
				working_template;

		// Templates need to be jQuery objects.
		// If it is a string or an HTMLElement,
		// run it through jQuery.
		if (!(parent_template instanceof jQuery)) {
			parent_template = $(parent_template);
		}

		// If the model was a Jr.Model, get the
		// actual data from it.
		if (data instanceof Jr.Model) {
			data = data.setData();
		}

		// Loop through the map.
		for (map_key in map) {

			// Reset the attr.
			attr = undefined;

			// If there is not a corresponding key in the data,
			// move on to the next map_key.
			if (!map_key in data) {
				continue;
			}

			// Jr.DataMap objects make it easier to extract
			// information about a value in a map.
			current_map = new Jr.DataMap(map[map_key]);

			// Get the selector to target in the template.
			current_map.getSelector();

			// Get the data that corresponds to the current map_key.
			current_data = data[map_key];

			// If a function was passed as the selector,
			// run it, passing the template jQuery object as
			// the context and the current_data as the arguments. 
			// TODO: Pass state and args to these functions.
			// TODO: Allow attr to be passed from these functions.
			if (typeof current_map.selector === 'function') {
				
				// Run function.
				selector = current_map.selector.apply(parent_template, [current_data]);
			}
			
			// If it's a string, just set it as the selector.
			else if (typeof current_map.selector === 'string') {
				selector = current_map.selector;
			}

			// Now, if an attr was extracted, set the attr
			// variable to it.
			if ('attr' in current_map) {
				attr = current_map.attr;
			}

			// If neither selector or attr could be extracted,
			// there's nothing more we can do. Go on to the next
			// map_key
			if (!(selector || attr)) {
				continue;
			}
			
			// If there is only the attribute, and no selector,
			// set template_match to the parent_template.
			else if (attr && (!selector)) {
				template_match = parent_template;	
			}
			
			// Otherwise, search for the selector within the
			// parent_template.
			else {
				template_match = parent_template.find(selector);
			}

			// If there were no matching elements, continue on
			// to the next map_key.
			if (!template_match.length) {
				continue;
			}

			// The fn attribute of a map is a function that
			// preprocess the data.
			if (typeof current_map.map.fn === 'function') {
				current_data = current_map.map.fn.apply(template_match, [current_data]);
			}

			// TODO: Finish commenting this function.
			if (!current_data) {
				continue;
			} else if (typeof current_data === 'string') {
				if (typeof attr === 'undefined') {
					attr = 'html';
				}
				switch (attr) {
					case 'html':
						template_match.html(current_data);
						break;
					case 'class':
						template_match.addClass(current_data);
						break;
					default: 
						template_match.attr(attr, current_data);
				}
			} else if (typeof current_data === 'object') {
				for (data_key in current_data) {
					if (typeof current_data[data_key] === 'string') {
						working_template = template_match;
					} else {
						working_template = template_match.clone();
					}

					var model = new Jr.Model(current_data[data_key]),
							view = new Jr.View({
								template: working_template,
								map: current_map.map
							}),
							viewmodel = new Jr.ViewModel(view, model);
					working_template = viewmodel.render();
					working_template.insertBefore(template_match);
				}
				template_match.remove();
			}
		}
		if (typeof cb === 'function') {
			cb.apply(parent_template);
		} else if (typeof cb === 'string') {
			$(cb).append(parent_template);
		}
		return parent_template;
	}

	Jr.DataMap = function(map) {
		this.map = map;
		this.getSelector();
	}

	Jr.DataMap.prototype.getSelector = function() {
		var selector, hasAttr, attr, undefined;
		if (typeof this.map === 'string') {
			selector = this.map;
		} else if (typeof this.map === 'object' && '$' in this.map) {
			selector = this.map['$'];
		} else {
			return false;
		}
		hasAttr = selector.indexOf(':');
		if (hasAttr != -1) {
			this.attr = selector.substr(hasAttr + 1);
			this.selector = selector.substr(0, hasAttr);
		} else {
			this.selector = selector;
		}
	}

	// Wrapper for Jr.ViewModel.render executed
	// by a constructed model.
	Jr.Model.prototype.render = function() {
		var view = arguments[0],
				callback = arguments[1];
		if (typeof view == 'string') {
			new Jr.View(view, function(model) {
				return function() {
					this.render(model);
				}
			}(this));
		} else if (view instanceof Jr.View) {
			Jr.renderViewModel(view, this, callback);
		}
	}
	
	// Returns the current hash representing the state.
	Jr.getLocation = function() {
		var hash = window.location.hash.substr(3);
		while (hash.substr(hash.length - 1) == "/") {
			hash = hash.substr(0, hash.length-1);
		}
		return hash;
	}

	// Relocate to a Jr uri.	
	Jr.goto = function(uri) {
		window.location = document.location.protocol+"//"+document.location.host+"/#!/"+uri;
	}
	
	// Allow a callback to be executed if
	// user clicks a link to the current page.
	Jr.conditionalGoto = function(uri, cb) {
		if (Jr.getLocation() !== uri) {
			Jr.goto(uri);
		} else {
			if (typeof cb === 'function') {
				cb();
			}
		}
	}
	Jr.monitor = function(lib, css) {
		return function() {

			// If we aren't monitoring, begin monitoring.
			if (!'interval' in arguments.callee) {
				arguments.callee.interval = window.setInterval(function(Jr){
					return function() {
						Jr.monitor();
					}
				}(Jr),200);
			}
			
			// Ensure we always have utility functions.
			$.extend(window, Jr.utilities);

			var 
					// Object to trigger events on.
					events_tgt = $(config.jr_events_target),

					// Get the URI from the hash.
					state = Jr.getLocation(),

					// Variable to store the rest of the URL segments. 
					args,

					// Flag for whether state and cached state meet certain
					// conditions that warrant loading a new controller.
					load_action = false;

			// If state is empty, try loading default controller.
			if (!state) {
				state = 'default_controller' in config && config.default_controller ? config.default_controller : 'index';
			}

			// If there is no cached state, or the cached state
			// does not equal the current state, load the controller
			if (!this.cache || state !== this.cache) {
				load_action = true;
			}

			// Cache.
			this.cache = state;

			// Separate the arguments from the
			// controller. First segment of the
			// URI is the 
			args = state.split('/');
			state = args.shift();

			// Trigger the monitorController event.
			events_tgt.trigger('monitorController', state, args);

			// If we are not loading a controller, we're done.
			if (!load_action) {
				return;
			}
			
			// Trigger the beforeControllerChange event.
			events_tgt.trigger('beforeControllerChange', [state, args]);

			// Load the controller.
			this.loadController(state, args);
		}
	}(lib, css);

	// Loads and runs a controller.
	Jr.loadController = function(state, args) {

		// Get an jQuery object represing the events target. 
		var events_tgt = $(config.jr_events_target);
		events_tgt.trigger('controllerLoad', state, args);
		require(["../app/c/"+state], function(state, args) {
			return function(action) {
				events_tgt.attr('id', state).attr('class', '').addClass(args.join('-'));
				if (action !== true) {
					switch (typeof action) {
						case 'function':
							action.apply(window, args);
							break;
						case 'object':
							if (!action instanceof Array) {
								break;
							}
							if (typeof action[0] == 'string' && typeof action[1] == 'string' && typeof action[2] == 'function') {
								var model = new Jr.Model(action[0]);
								new Jr.View(action[1], function() {
									var template = this.render(model);
									action[2].apply(Jr, [template]);
								});
							}
							break;
					}
					events_tgt.trigger('afterControllerChange', state, args);
				}
			}
		}(state, args));
	}

	// Test if an element is an exception.
	Jr.isException = function(element) {
		if ('aExceptions' in Jr) {
			for (var i in Jr.aExceptions) {
				if (Jr.aExceptions[i] == this) {
					return true;
				}
			}
		}
		return false;
	}

	// Bind this to anything with an href
	// that you wish to act as a link.
	Jr.link = function(Jr) {
		return function(e) {
			if (Jr.isException(this)) {
				return;
			}
			e.preventDefault();
			var uri = $(this).attr('href');
			if (uri && (uri.indexOf('.') == -1) && (uri.indexOf(':') == -1)) {
				Jr.goto(uri);
			} else {
				window.location = uri;
			}
		}
	}(Jr);
	
	// If there's an init controller, load it.
	if (config.init_controller) {
		Jr.loadController(config.init_controller, []);
	}
	return Jr;
});
