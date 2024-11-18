$(function ()
{
	app =
	{
		controller: entityos._util.controller.code,
		vq: entityos._util.view.queue,
		get: entityos._util.data.get,
		set: entityos._util.data.set,
		invoke: entityos._util.controller.invoke,
		add: entityos._util.controller.add,
		show: entityos._util.view.queue.show
	};

	entityos._util.controller.invoke('foot-hold-init');
});

entityos._util.controller.add(
{
	name: 'foot-hold-init',
	code: function ()
	{
		$.ajax(
		{
			type: 'GET',
			url: '/site/2149/building-on-cardano.json',
			dataType: 'json',
			success: function (data)
			{
				var languagesMachineView = app.vq.init({queue: 'foot-hold-languages-machine-view'});

				var languages = data['building-on-cardano']['languages']['machine'];

				languages = _.sortBy(languages, 'caption');

				app.set({scope: 'building-on-cardano', context: 'languages-machine', value: languages});

				_.each(languages, function (language)
				{
					languagesMachineView.add(
					[
						'<li class="mb-1"><a class="dropdown-item entityos-dropdown lead" data-name="', language.name, '">',
							language.caption,
						'</a></li>'
					]);
				});

				languagesMachineView.render('#building-on-cardano-machine-languages');

				entityos._util.controller.invoke('building-on-cardano-init');
			},
			error: function (data) { }
		});
	}
});

entityos._util.controller.add(
{
	name: 'building-on-cardano-init',
	code: function ()
	{
		var uriContext = window.location.pathname;

		if (uriContext != '/foot-hold')
		{
			var languagesMachine = app.get({scope: 'building-on-cardano', context: 'languages-machine'});

			var uriContextData = _.replace(uriContext, '/foot-hold/', '');

			if (uriContextData != '')
			{
				var language = _.find(languagesMachine, function (language)
				{
					return (language.name == uriContextData)
				});

				if (language != undefined)
				{
					app.show('span.dropdown-text', language.caption);
					app.set({ scope: 'building-on-cardano-machine-languages', value:  {dataContext: language.name} });
					entityos._util.controller.invoke('building-on-cardano-template-show', {dataContext: language.name});
				}
			}
		}
	}
});

entityos._util.controller.add(
{
	name: 'building-on-cardano-template',
	code: function (param)
	{
		var dataContext = app.get({ scope: 'building-on-cardano-template', context: 'dataContext', valueDefault: {} });
		var languageMachineName = dataContext.name;
		var languagesMachine = app.get({scope: 'building-on-cardano', context: 'languages-machine'});

		var languageMachineTemplate = app.get({scope: 'building-on-cardano', context: 'language-machine-template'});

		if (languageMachineTemplate != undefined)
		{
			app.invoke('building-on-cardano-template-process');
		}
		else
		{
			var _languageMachine = _.find(languagesMachine, function (language)
			{
				return (language.name == languageMachineName)
			});

			if (_languageMachine != undefined)
			{
				languageMachineTemplate = _.first(_languageMachine.templates)
			}

			app.set(
			{
				scope: 'building-on-cardano',
				context: 'language-machine-template',
				value: languageMachineTemplate
			});

			app.set(
			{
				scope: 'building-on-cardano-template',
				context: 'url',
				value: languageMachineTemplate.url
			});

			app.show('#building-on-cardano-view', '<h3 class="text-muted text-center mt-6">Initialising template ...</h3>');

			$.ajax(
			{
				type: 'GET',
				url: languageMachineTemplate.url,
				dataType: 'json',
				cache: false,
				success: function (data)
				{
					app.set({scope: 'building-on-cardano-template', context: languageMachineName, value: data['building-on-cardano'].template});
					app.invoke('building-on-cardano-template-show');
				},
				error: function (data) { }
			});
		}
	}
});

entityos._util.controller.add(
{
	name: 'building-on-cardano-template-show',
	code: function (param)
	{
		var data = app.get(
		{
			scope: 'building-on-cardano-template'
		});

		var template = data[data.dataContext.name]

		console.log(template);
		
		var templateView = app.vq.init({ queue: 'template-view' });

		app.set({ scope: 'building-on-cardano', context: 'current-template', value: template });

		if (template == undefined)
		{
			templateView.add('<h3 class="text-muted text-center mt-6">Can not find the template.</h3>');
		}
		else
		{
			// Caption

			templateView.add(['<h2 class="text-center mt-6">', template.caption ,'</h2>']);

			// Context

			templateView.add(_.map(template.context, function (context)
			{
				return '<div class="text-secondary text-center mt-2 lead">' + context + '</div>'
			}));

			// Prerequisites

			if (template.prerequisites.length != 0)
			{
				templateView.add(
				[
					'<div class="row mt-6">',
						'<div class="col-12 text-center text-info">',
							'<a data-toggle="collapse" href="#prerequisites" class="text-info entityos-collapse-toggle">',
								'<h2><i class="fe fe-clipboard"></i> Prerequisites <i class="fe fe-chevron-down"></i></h2>',
							'</a>',
						'</div>',
						'<div class="col-12 collapse" id="prerequisites">',
							'<div class="card shadow-lg">',
								'<div class="card-body">'
				]);
							_.each(template.prerequisites, function (prerequisite)
							{
								templateView.add(
								[
									'<div class="text-secondary text-center mt-2 lead">',
									prerequisite,
									'</div>'
								]);
							});

				templateView.add(
				[
								'</div>',
							'</div>',
						'</div>',
					'</div>'
				])
			}

			// Set Up

			if (template.setup.length != 0)
			{
				templateView.add(
				[
					'<div class="row mt-6">',
						'<div class="col-12 text-center text-info">',
							'<a data-toggle="collapse" href="#setup" class="text-info entityos-collapse-toggle">',
								'<h2><i class="fe fe-settings"></i> Set Up <i class="fe fe-chevron-down"></i></h2>',
							'</a>',
						'</div>',
						'<div class="col-12 collapse entityos-collapse" data-controller="building-on-cardano-template-show-setup" data-on-show="true" id="setup">',
							'<div class="card shadow-lg">',
								'<div class="card-body" id="building-on-cardano-template-show-setup-view">',
								'</div>',
							'</div>',
						'</div>',
					'</div>'
				])
			}

			// Sources

			templateView.add(
			[
				'<div class="text-secondary text-center mt-10 pt-2 border-top border-gray-900-50">', 
				'</div>'
			]);


			if (template['source-url'] != undefined)
			{
				templateView.add(
				[
					'<div class="text-secondary text-center mt-4">', 
						'<a href="', template['source-url'], '" target="_blank" class="text-secondary">Template Based On <i class="fe fe-external-link"></i></a>',
					'</div>'
				]);
			}

			templateView.add(
			[
				'<div class="text-secondary text-center mt-4">', 
					'<a href="', data.url, '" target="_blank" class="text-secondary">View Source Template (JSON) <i class="fe fe-external-link"></i></a>',
				'</div>'
			]);

			if (template['sharing'] != undefined)
			{
				templateView.add(
				[
					'<div class="text-secondary text-center mt-4">', 
						'Template shared as ', template['sharing'],
					'</div>'
				]);
			}

			templateView.add(
			[
				'<div class="text-secondary text-center mt-4">', 
					'<a href="https://github.com/selfdriven-foundation/about/tree/main/community-projects-we-support/2149%20(buildingoncardano-dev)/foot-hold" target="_blank" class="text-secondary"><i class="fe fe-github"></i> View On GitHub <i class="fe fe-external-link"></i></a>',
				'</div>'
			]);

			

			templateView.render('#building-on-cardano-view');			
		}
		
	}
});

entityos._util.controller.add(
{
	name: 'building-on-cardano-template-show-setup',
	code: function (param)
	{
		var viewStatus = entityos._util.param.get(param, 'status').value;

		if (viewStatus == 'show')
		{
			var templateSetupView = app.vq.init({ queue: 'template-setup-view' });
			templateSetupView.add('<div class="text-muted text-center">Initialising...</div>');
			templateSetupView.render('#building-on-cardano-template-show-setup-view');
		}
		else
		{
			var data = app.get(
			{
				scope: 'building-on-cardano-template'
			});

			var template = data[data.dataContext.name];

			// Does the set up have code-file references?

			var templateFileReferences = _.map(_.filter(template.setup, function (setup)
			{
				return (setup['code-file'] != undefined)
			}), 'code-file');

			if (templateFileReferences.length == 0)
			{
				entityos._util.controller.invoke('building-on-cardano-template-show-setup-show');
			}
			else
			{
				entityos._util.controller.invoke('building-on-cardano-template-get-references',
				{
					references: templateFileReferences,
					baseURL: 'https://raw.githubusercontent.com/selfdriven-foundation/about/main/community-projects-we-support/2149%20(buildingoncardano-dev)/',
					onComplete: 'building-on-cardano-template-show-setup-show'
				});
			}
		}
	}
});


entityos._util.controller.add(
{
	name: 'building-on-cardano-template-get-references',
	code: function (param)
	{
		var references = entityos._util.param.get(param, 'references').value;
		var baseURL = entityos._util.param.get(param, 'baseURL').value;

		var referenceIndex = entityos._util.param.get(param, 'referenceIndex', {default: 0, set: true}).value;

		if (referenceIndex < references.length)
		{
			var reference = references[referenceIndex];
			var referenceURL = baseURL + reference;

			$.ajax(
			{
				type: 'GET',
				url: referenceURL,
				dataType: 'text',
				cache: false,
				success: function (data)
				{
					app.set(
					{
						scope: 'building-on-cardano-template-get-references',
						context: reference,
						value: data
					});

					param.referenceIndex = referenceIndex + 1;

					app.invoke('building-on-cardano-template-get-references', param);
				},
				error: function (data) { }
			});
		}
		else
		{
			entityos._util.onComplete(param);
		}
	}
});


entityos._util.controller.add(
{
	name: 'building-on-cardano-template-show-setup-show',
	code: function (param)
	{
		var data = app.get(
		{
			scope: 'building-on-cardano-template'
		});

		var template = data[data.dataContext.name];

		var templateSetupView = app.vq.init({ queue: 'template-setup-view' });

		_.each(template.setup, function (setup)
		{
			if (setup.text != undefined)
			{
				templateSetupView.add(
				[
					'<div class="text-secondary text-center mt-2 lead">',
						setup.text,
					'</div>'
				]);
			}

			if (setup['code-file'] != undefined)
			{
				templateSetupView.add(
				[
					'<div class="text-secondary text-center mt-2 lead">',
						setup['code-file'],
					'</div>'
				]);
			}
		});

		templateSetupView.render('#building-on-cardano-template-show-setup-view');
	}
});
