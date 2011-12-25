// Grab the config.js file, containing
// the configuration object.
define(["../app/config"], function(config, Tools) {
	var Jr = {
			load: {},
			render: {}
		},
		lib = function(str) {
			return "../../lib/"+str;
		},
		css = function(d, h) {
			return function(str, abs) {
				if ((!abs) && config.css_path) {
					str = config.css_path + str + '.css';
				}
				var s = d.createElement('link');
				$.extend(s, {
					href: str,
					type: 'text/css',
					rel: 'stylesheet'
				});
				h.appendChild(s);
			}
		}(document, document.getElementsByTagName('head')[0]);
	$.extend(window, { 
		lib: lib,
		css: css
	});

	Jr.aExceptions = [];

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

	Jr.ViewModel = function(view, model) {
		this.view = view;
		this.model = model;
	}
	
	Jr.ViewModel.prototype.render = function(cb) {
		var parent_template = this.view.data.template,
				map = this.view.data.map,
				undefined,
				data = this.model,
				map_key, data_key, current_data, current_map, template_match, selector, attr, working_template;
		if (!(parent_template instanceof jQuery)) {
			parent_template = $(parent_template);
		}
		if (data instanceof Jr.Model) {
			data = data.setData();
		}
		for (map_key in map) {
			attr = undefined;
			if (!map_key in data) {
				continue;
			}
			current_map = new Jr.DataMap(map[map_key]);
			current_map.getSelector();
			current_data = data[map_key];
			if (typeof current_map.selector === 'function') {
				selector = current_map.selector.apply(parent_template, [current_data]);
			} else if (typeof current_map.selector === 'string') {
				selector = current_map.selector;
			}
			if ('attr' in current_map) {
				attr = current_map.attr;
			}
			if (!(selector || attr)) {
				continue;
			} else if (attr && (!selector)) {
				template_match = parent_template;	
			} else {
				template_match = parent_template.find(selector);
			}
			if (!template_match.length) {
				continue;
			}
			if (typeof current_map.map.fn === 'function') {
				current_data = current_map.map.fn.apply(template_match, [current_data]);
			}
			if (typeof current_data === 'string') {
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
	
	Jr.goto = function(uri) {
		window.location = document.location.protocol+"//"+document.location.host+"/#!/"+uri;
	}
	Jr.getLocation = function() {
		var hash = window.location.hash.substr(3);
		while (hash.substr(hash.length - 1) == "/") {
			hash = hash.substr(0, hash.length-1);
		}
		return hash;
	}
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
			$.extend(window, { 
				lib: lib,
				css: css
			});
			var state = Jr.getLocation(),
					load_action = false,
					args;		
			if (!state) {
				state = config.default_controller ? config.default_controller : 'index';
			}
			if (!this.cache) {
				load_action = true;
			} else {
				if (state !== this.cache) {
					load_action = true;
				}
			}
			this.cache = state;
			args = state.split('/');
			state = args.shift();
			$('body').trigger('monitorController', state, args);
			if (!load_action) {
				return;
			}
			$('body').trigger('beforeControllerChange', [state, args]);
			this.loadController(state, args);
		}
	}(lib, css);

	Jr.loadController = function(state, args) {
		$('body').trigger('controllerLoad', state, args);
		require(["../app/c/"+state], function(state, args) {
			return function(action) {
				$('body').attr('id', state).attr('class', '').addClass(args.join('-'));
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
					$('body').trigger('afterControllerChange', state, args);
				}
			}
		}(state, args));
	}

	if (config.init_controller) {
		Jr.loadController(config.init_controller, []);
	}
	return Jr;
});
