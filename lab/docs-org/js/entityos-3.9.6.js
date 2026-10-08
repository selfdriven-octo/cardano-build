/*!
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/
 * Requires: jQuery, /jscripts/md5-min.js
 * Based on entityos.cloud platform
 */

 "use strict";

var entityos =
{
	_scope:
	{
		app: {options: {}, build:{}},
		sentToView: [],
		viewQueue: {content: {}, template: {}, roles: {}, data: {}},
		session: {},
		space: {},
		data: {defaultQueue: 'base', loaded: false}
	},
	_events: {},
	_cloud: {log: [], object: {}, method: {}}
};

entityos.init = function (data)
{
	$.ajaxSetup(
	{
		cache: false,
		dataType: 'json',
		global: true,
		headers: {"cache-control": "no-cache"},
		beforeSend: function (oRequest)
		{
			oRequest.setRequestHeader("X-HTTP-myds-rest-level", 0);
			oRequest.setRequestHeader("X-HTTP-entityos-rest-level", 0);
		}
	});

	$.ajaxPrefilter(function(options, originalOptions, jqXHR)
	{
        originalOptions._error = originalOptions.error;
        originalOptions._success = originalOptions.success;
        originalOptions._id = _.now();
		
		var _controller;
		
		if (originalOptions.data != undefined)
		{
			if (_.isObject(originalOptions.data))
			{
				_controller = originalOptions.data._controller;
				originalOptions.data._id = originalOptions._id;
			}
		}
		
		if (_controller != undefined)
		{
			entityos._scope.data[_controller] = originalOptions._id;
			originalOptions._controller = _controller;
		}

		options.error = function(_jqXHR, _textStatus, _errorThrown)
		{
			if (originalOptions.retryLimit == undefined)
			{
				originalOptions.retryLimit = 3;
			}

			if (originalOptions.retryCount == undefined) {originalOptions.retryCount = 0}

			if (originalOptions.retryCount == originalOptions.retryLimit || String(_jqXHR.status).substr(0,1) !== '5')
			{
				if (originalOptions._error) {originalOptions._error(_jqXHR, _textStatus, _errorThrown)}
				return;
			};

			originalOptions.retryCount = originalOptions.retryCount + 1;

			$.ajax(originalOptions);
		}

        options.success = function(data, _textStatus, _jqXHR)
        {
            entityos._scope.data.ajaxSettings = undefined;

            if (originalOptions.global != false)
            {	
                if (data.status == 'ER')
                {
                    if (data.error.errorcode == '1')
                    {
                        originalOptions.success = originalOptions._success;
                        originalOptions._success = undefined;
                        entityos._scope.data.sendOnLogon = originalOptions;

                        entityos._util.sendToView(
                        {
                            from: 'entityos-auth',
                            status: 'error',
                            message: 'not-authenticated'
                        });

                    }
                    else if ((data.error.errornotes).toLowerCase().indexOf('undefined') != -1)
                    {
                        entityos._util.sendToView(
                        {
                            from: 'entityos-core',
                            status: 'error',
                            message: 'There is an error with this app.'
                        });
                    }	
                    else
                    {	
                        entityos._util.sendToView(
                        {
                            from: 'entityos-core',
                            status: 'error',
                            message: data.error.errornotes
                        });
                    }	
                }
            }	
                
            var valid = true;
            
            if (originalOptions._id != undefined && originalOptions._controller != undefined)
            {
                valid = (entityos._scope.data[originalOptions._controller] == originalOptions._id);
            }
                
            if (valid && originalOptions._success !== undefined)
            {
                if (originalOptions._managed && originalOptions._rf.toLowerCase() == 'csv')
                {
                    data = entityos._util.convert.csvToJSON({response: data})
                }	

                delete entityos._scope.data[originalOptions._controller];
                originalOptions._success(data)
            };
        }	
    });

    $(document).ajaxError(function(oEvent, oXMLHTTPRequest, oAjaxOptions, oError) 
    {
        if (oAjaxOptions.global == true)
        {
            if (oXMLHTTPRequest.statusText == 'parsererror')
            {
                // Handled in the error: section of the .ajax call (below)
            }
            else
            {
                entityos._util.sendToView(
                {
                    from: 'entityos-core',
                    status: 'error',
                    message: 'There is an error communicating with the cloud service. Try re-opening the website.'
                });
            }
        }
    });	

	if (typeof arguments[0] != 'object')
	{
		data =
		{
			viewStart: arguments[0],
			viewUpdate: arguments[1],
			options: arguments[2],
			views: arguments[3],
			site: arguments[4],
			viewAssemblySupport: arguments[5],
			viewStarted: arguments[6]
		}
	}

	if (data.viewAssemblySupport && _.isFunction(entityos._util.factory.core))
	{
		entityos._util.factory.core()
	}

	if (_.isFunction(data.viewStarted))
	{
		data.viewStarted()
	}

	if (_.isFunction(data.viewStarting))
	{
		data.viewStarting()
	}

	if (_.isFunction(app.controller[data.viewStarted]))
	{
		app.controller[data.viewStarted]()
	}

	if (_.isFunction(app.controller[data.viewStarting]))
	{
		app.controller[data.viewStarting]()
	}

	data.site = data.site || window.entityosSiteId;
	data.options.objects = (data.options.objects!=undefined?data.options.objects:true);

	if (data.options.dateFormats == undefined)
	{
		data.options.dateFormats = ['D MMMM YYYY', 'DD MMMM YYYY', 'DD MMM YYYY', 'D MMM YYYY', 'D/MM/YYYY', 'DD/MM/YYYY', 'DD MMM YYYY HH:mm:ss']
	}

	var uriPath = window.location.pathname;
	var uriName = (uriPath).replace(/\//g,'');
		
	data.uri = '';
 	if (uriName != '')
 	{
 		data.uri = '/' + uriName
 	};

	data.uriContext = window.location.hash;

	entityos._scope.app = data;

	if (entityos._scope.app.options.auth == undefined)
		{entityos._scope.app.options.auth = true}
	
	entityos._util.init(data);
}

entityos.register = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			spacename: arguments[0],
			firstname: arguments[1],
			surname: arguments[2],
			email: arguments[3],
			emaildocument: arguments[4],
			notes: arguments[5],
			type: arguments[6] || 'space',
			callback: arguments[7],
			object: (arguments[8]!=undefined?arguments[8]:'space'),
		}
	}

	if (param.object==undefined) {param.object = 'space'}
	param.emaildocument = (param.emaildocument!=undefined?param.emaildocument:entityos._scope.app.options.registerDocument);

	entityos._util.register[param.object].create(param);
}

entityos.reset = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			currentpassword: arguments[0],
			newpassword: arguments[1],
			newpasswordconfirm: arguments[2],
			expiredays: arguments[3],
			site: arguments[4],
			callback: arguments[5]
		}
	}

	if (param.newpassword != param.newpasswordconfirm)
	{
		entityos._util.sendToView(
		{
			from: 'entityos-reset',
			status: 'error',
			message: 'New passwords do not match.'
		});
	}
	else if (param.newpassword == '')
	{
		entityos._util.sendToView(
		{
			from: 'entityos-reset',
			status: 'error',
			message: 'New password can not be blank.'
		});
	}
	else
	{
		entityos._util.user.password[param.type](param);
	}	
}

entityos.auth = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			logon: arguments[0],
			password: arguments[1],
			code: arguments[2],
			callback: arguments[3]
		}
	}

	if (entityos._scope.logonInitialised)
	{
		entityos._util.logon.send(param);
	}
	else
	{
		entityos._util.logon.init(param);
	}	
}

entityos.deauth = function (param)
{
	entityos._util.logoff(param);
}

entityos.create = function (param)
{
	var get = entityos._util.param.get(param, 'get').value;

	if (get == undefined)
	{
		entityos._create(param)
	}
	else
	{
		var getData = entityos._util.data.get(get);
		var data;

		if (getData != undefined)
		{
			if (get.field == undefined) {get.field = 'id'}

			if (param.callback == undefined)
			{
				_.each(getData, function (_getData, gd)
				{
					data = {}
					data[get.field] = _getData[get.field];
					param.data = _.assign(param.data, data);
					_getData.processed = true;
					entityos._create(param);
				});
			}
			else
			{
				var getDataUnprocessed = _.filter(getData, function (_getData) {return !_getData.processed})

				if (getDataUnprocessed.length != 0)
				{
					var _getData = _.first(getDataUnprocessed);
					_getData.processed = true;

					data = {}
					data[get.field] = _getData[get.field];
					param.data = _.assign(param.data, data);

					if (getDataUnprocessed.length == 1)
					{
						param.callback = param._callback;
						param.callbackParam = param._callbackParam;
					}
					else
					{
						param._callback = param.callback;
						param._callbackParam = param.callbackParam;

						param.callback = entityos.create;
						param.callbackParam = param
					}
					
					entityos._create(param);
				}
			}
		}
	}
}

entityos._create = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			object: arguments[0],
			data: arguments[1],
			callback: arguments[2],
			mode: arguments[3]
		}
	}

	if (param.data == undefined && param.fields != undefined)
	{
		param.data = param.fields;
	}

	var send = true;

    if (_.startsWith(param.object, '_'))
    {
		/*
		entityos.cloud.save(
		{
			object: '_test_1',
			fields:
			{
				_field1: 'A',
				_field2: '1'
			}
		})
		*/

		if (param.data == undefined) {param.data = {}}

		if (param.data.objectcontext == undefined)
		{
			param.data.object = 41;

			if (param.data.id != undefined)
			{
				param.data.objectcontext = param.data.id;
			}

			var structure = _.find(entityos._scope.data.structures, function (structure)
			{
				return structure.alias == param.object
			});

			if (structure == undefined)
			{
				send = false;
			}
			else
			{
				param.data.structure = structure.id;

				if (param.data.title == undefined)
				{
					param.data.title = structure.title + ' [' + moment().format('DD MMM YYYY HH:mm:ss') + ']'
				}

				param.object = 'structure_data';
			}
		}
    }

	if (!send)
	{
		console.log('!!ERROR; Bad object; ' + param.object)
	}
	else
	{
		var endpoint = param.object.split('_')[0];

		entityos._util.send(
		{
			object: param.object,
			data: param.data,
			callback: param.callback,
			callbackParam: param.callbackParam,
			callbackIncludeResponse: param.callbackIncludeResponse,
			mode: param.mode,
			type: 'POST',
			url: '/rpc/' + endpoint + '/?method=' + (param.object).toUpperCase() + '_MANAGE',
			manageErrors: param.manageErrors,
			managed: param.managed,
			notify: param.notify,
			set: param.set,
			datareturn: param.responseFields
		});
	}
}

entityos.update = entityos.create;
entityos.save = entityos.create;

entityos.invoke = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			method: arguments[0],
			data: arguments[1],
			callback: arguments[2],
			mode: arguments[3]
		}
	}

	if (param.method == undefined)
	{
		entityos._util.log.add(
		{
			message: 'No method to invoke'
		})
	}
	else
	{
		var endpoint = param.method.split('_')[0];	

		entityos._util.send(
		{
			object: param.object,
			data: param.data,
			callback: param.callback,
			callbackParam: param.callbackParam,
			callbackIncludeResponse: param.callbackIncludeResponse,
			mode: param.mode,
			type: 'POST',
			url: '/rpc/' + endpoint + '/?method=' + (param.method).toUpperCase(),
			manageErrors: param.manageErrors,
			managed: param.managed,
			notify: param.notify
		});
	}
}

entityos.retrieve = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			object: arguments[0],
			data: arguments[1],
			callback: arguments[2],
			rf: arguments[3],
			managed: arguments[4],
			rows: arguments[5]
		}
	}

	if (param.object == undefined)
	{
		entityos._util.sendToView(
		{
			from: 'entityos-retrieve',
			status: 'error-internal',
			message: 'No object'
		});
	}
	else
	{
		if (typeof param.data == 'string')
		{
			var id = param.data;

			if (id != undefined)
			{
				param.data = {criteria: entityos._util.search.init()};

				if (entityos._objects != undefined)
				{
					var object = $.grep(entityos._objects, function (object) {return object.name == param.object})[0];
					if (object != undefined) {param.data.criteria.fields = $.map(object.properties, function (property) {return {name: property.name}})}
				}

				param.data.criteria.filters.push(
				{
					name: 'id',
					comparison: 'EQUAL_TO',
					value1: id
				});
			}
			else
			{
				param.managed = false;
			}
		}
		else
		{
			if (_.has(param.data, 'criteria'))
			{
				if (_.has(param.data.criteria, 'options'))
				{
					if (_.isUndefined(param.data.criteria.options.rows))
					{
						param.data.criteria.options.rows = entityos._scope.app.options.rows;
					}
				}
				else
				{
					param.data.criteria.options = {rows: entityos._scope.app.options.rows}
				}
			}
			else
			{
				if (param.data == undefined && (_.has(param, 'fields') || _.has(param, 'summaryFields')))
				{
					param.data = {criteria: entityos._util.search.init()};

					if (_.has(param, 'fields'))
					{ 
						if (param.fields != undefined)
						{
							if (_.isArray(param.fields))
							{
								if (_.isObject(_.first(param.fields)))
								{
									param.data.criteria.fields = param.fields;
								}
								else
								{
									param.data.criteria.fields = _.map(param.fields, function (field) {return {name: field}});
								}
							}
						}
					}

					if (_.has(param, 'filters'))
					{ 
						if (!_.isArray(param.filters) && _.isObject(param.filters))
						{
							var _filters = [];

							_.each(param.filters, function (filterValue, filterField)
							{
								_filters.push(
								{
									field: filterField,
									value: filterValue
								});
							});

							param.filters = _filters;
						}
					}

					if (_.has(param, 'sorts'))
					{ 
						if (_.isArray(param.sorts))
						{
							if (_.isObject(_.first(param.sorts)))
							{
								_.each(param.sorts, function (sort)
								{
									if (sort.direction == undefined)
									{
										sort.direction = 'asc'
									}

									if (sort.name == undefined)
									{
										sort.name = sort.field
									}
								});
							}
							else
							{
								param.sorts = _.map(param.sorts, function (sort) {return {name: sort, direction: 'asc'}});
							}
						}

						param.data.criteria.sorts = param.sorts
					}

					if (_.has(param, 'sort'))
					{ 
						param.data.criteria.sorts = [{name: param.sort, direction: 'asc'}]
					}

					if (_.has(param, 'summaryFields')) { param.data.criteria.summaryFields = param.summaryFields }
					if (_.has(param, 'filters')) { param.data.criteria.filters = param.filters }
					if (_.has(param, 'options')) { param.data.criteria.options = param.options }
					if (_.has(param, 'customOptions')) { param.data.criteria.customoptions = param.customOptions }
					if (_.has(param, 'rows')) { param.data.criteria.options.rows = param.rows }
				}
				else
				{
					param.managed = false;
				}
			}	
		}

		if (_.has(param, 'data'))
		{
			if (_.has(param.data.criteria, 'filters'))
			{
				_.each(param.data.criteria.filters, function (filter)
				{
					if (filter.value != undefined)
					{
						filter.value1 = filter.value;
						delete filter.value;
					}

					if (filter.name == undefined && filter.field != undefined)
					{
						filter.name = filter.field;
						delete filter.field;
					}

					if (filter.name == undefined)
					{
						filter.name = 'id'
					}

					if (filter.name.toLowerCase() != 'or' && filter.name.toLowerCase() != 'and' && filter.name != '(' && filter.name != ')')
					{
						if (filter.comparison == undefined)
						{
							filter.comparison = 'EQUAL_TO'
						}
					}

					if (filter.comparison == 'IN_LIST')
					{
						if (_.isArray(filter.value1))
						{
							filter.value1 = _.join(filter.value1, ',');
						}

						if (filter.value1 == '' || filter.value1 == undefined)
						{
							filter.value1 = '-1';
						}
					}
				});
			}

			if (_.has(param.data.criteria, 'fields'))
			{
				var includeMetadataGUID = (param.includeMetadataGUID==undefined?true:param.includeMetadataGUID);
				var includeMetadataFields = (param.includeMetadata==undefined?false:param.includeMetadata);
				var includeMetadataAdvancedFields = (param.includeMetadataAdvanced==undefined?false:param.includeMetadataAdvanced);
				var includeMetadataSnapshotFields = (param.includeMetadataSnapshot==undefined?false:param.includeMetadataSnapshot);

				if (includeMetadataGUID)
				{
					if (_.isUndefined(_.find(param.data.criteria.fields, function (field) {return field.name == 'guid'}))
							&& _.isUndefined(_.find(param.data.criteria.fields, function (field) {return _.includes(field.name, '(')})))
					{
						param.data.criteria.fields = _.concat(
							param.data.criteria.fields,
							[
								{name: 'guid'}
							]);
					}
				}

				if (includeMetadataFields)
				{
					param.data.criteria.fields = _.concat(
						param.data.criteria.fields,
						[
							{name: 'createddate'},
							{name: 'createduser'},
							{name: 'createdusertext'},
							{name: 'guid'},
							{name: 'modifieddate'},
							{name: 'modifieduser'},
							{name: 'modifiedusertext'},
							{name: 'session'}
						]);
				}

				if (includeMetadataAdvancedFields)
				{
					param.data.criteria.fields = _.concat(
						param.data.criteria.fields,
						[
							{name: 'createddatetimezone'},
							{name: 'createddatetimezonetext'},
							{name: 'modifieddatetimezone'},
							{name: 'modifieddatetimezonetext'},
							{name: 'etag'}
						]);
				}

				if (includeMetadataSnapshotFields)
				{
					param.data.criteria.fields = _.concat(
						param.data.criteria.fields,
						[
							{name: 'snapshotcreateddate'},
							{name: 'snapshotcreateddatetimezone'},
							{name: 'snapshotcreateddatetimezonetext'},
							{name: 'snapshotcreateduser'},
							{name: 'snapshotcreatedusertext'},
							{name: 'snapshotmodifieddate'},
							{name: 'snapshotmodifieddatetimezone'},
							{name: 'snapshotmodifieddatetimezonetext'},
							{name: 'snapshotmodifieduser'},
							{name: 'snapshotmodifiedusertext'},
							{name: 'snapshotofid'}
						]);
				}
			}
		}

		if (_.isArray(entityos._scope.app.options.customOptions))
		{
			var objectCustomOptions = _.filter(entityos._scope.app.options.customOptions, function (customOption)
			{
				return (customOption.object == param.object)
			});

			if (objectCustomOptions.length > 0)
			{
				var include;

				var customOptions = _.filter(objectCustomOptions, function (objectCustomOption)
				{
					include = _.isUndefined(_.find(param.data.criteria.customOptions,
						function (customOption)
						{
							customOption.name != objectCustomOption.name
						}));

					return include
				});

				var criteriaCustomOptions = _.map(customOptions, function (customOption)
				{ 
					return {name: customOption.name, value: customOption.value}
				});

				if (_.isArray(param.data.criteria.customOptions))
				{
					param.data.criteria.customoptions = _.concat(param.data.criteria.customOptions, criteriaCustomOptions)
				}
				else
				{
					param.data.criteria.customoptions = criteriaCustomOptions;
				}
			}
		}

		var send = true;

		if (_.startsWith(param.object, '_'))
		{
			/*
			entityos.cloud.search(
			{
				object: '_test_1',
				fields:
				[
					'_field1',
					'_field2'
				],
				filters:
				[
					{
						field: '_field1',
						value: 'A'
					}
				]

			})
			*/

			if (param.data.objectcontext == undefined)
			{
				var structure = _.find(entityos._scope.data.structures, function (structure)
				{
					return structure.alias == param.object
				});

				if (structure == undefined)
				{
					send = false;
				}
				else
				{
					if (param.data.criteria.filters == undefined) {param.data.criteria.filters = []}
					
					param.data.criteria.filters.push(
					{
						name: 'structure',
						comparison: 'EQUAL_TO',
						value: structure.id
					});

					param.data.criteria.filters.push(
					{
						name: 'object',
						comparison: 'EQUAL_TO',
						value: '41'
					});

					var idFilter = _.find(param.data.criteria.filters, function(filter)
					{
						return filter.name == 'id'
					});

					if (idFilter != undefined)
					{
						idFilter.name = 'objectcontext'
					}

					param.object = 'structure_data';
				}
			}
		}

		if (!send)
		{
			console.log('!!ERROR; Bad object; ' + param.object)
		}
		else
		{
			param.endpoint = param.object.split('_')[0];
			param.type = 'POST';
			param.url = '/rpc/' + param.endpoint + '/?method=' + (param.object).toUpperCase() + '_SEARCH';
			param.notify = param.notify;

			if (_.has(param.data, '_controller'))
			{
				param.data._controller = param.object + ':' + JSON.stringify(param.data.criteria.fields);
			}

			entityos._util.send(param);
		}
	}
}

entityos.delete = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			object: arguments[0],
			data: arguments[1],
			callback: arguments[2]
		}
	}

	if (typeof param.data != 'object')
	{
		param.data = {id: param.data}
	}
	else
	{
		if (_.has(entityos, '_scope.data._guids.' + param.object
				&& _.has(param, 'data.guid')))
		{
			param.data.id = entityos._scope.data._guids[param.object][param.data.guid]
		}
	}

	param.endpoint = param.object.split('_')[0];
	param.data.remove = 1;

	entityos._util.send(
	{
		object: param.object,
		data: param.data,
		callback: param.callback,
		callbackParam: param.callbackParam,
		callbackIncludeResponse: param.callbackIncludeResponse,
		type: 'POST',
		url: '/rpc/' + param.endpoint + '/?method=' + (param.object).toUpperCase() + '_MANAGE',
		manageErrors: param.manageErrors,
		managed: param.managed,
		notify: param.notify
	});
}

entityos.cloud = 
{
	auth: entityos.auth,
	deauth: entityos.deauth,
	save: entityos.save,
	delete: entityos.delete,
	retrieve: entityos.retrieve,
	search: entityos.retrieve,
	query: entityos.retrieve,
	invoke: entityos.invoke
}

entityos.cloud.check = function (param, response)
{
	if (response == undefined)
	{
		entityos.invoke(
		{
			method: 'core_get_user_details',
			callback: entityos.cloud.check,
			callbackParam: param
		});
	}
	else
	{
		if (response.status == 'ER')
		{
			entityos._util.logoff();
		}
		else
		{
			entityos._util.onComplete(param)
		}
	}
}

entityos.help = function ()
{
	return {scope: entityos._scope}
}

entityos.setting = function (param)
{
	if (typeof arguments[0] != 'object')
	{
		param =
		{
			id: arguments[0],
			value: arguments[1],
			custom: (arguments[2]?'Y':'N')
		}
	}
			
	var data =
	{
		attribute: param.id,
		custom: (param.custom?'Y':'N'),
		value: param.value
	}
	
	if (data.attribute == undefined) {data.attribute = param.attribute}

	entityos._util.send(
	{
		object: 'core_profile',
		data: data,
		callback: param.callback,
		type: 'POST',
		url: '/rpc/core/?method=CORE_PROFILE_MANAGE',
	});
}

entityos.options = function (param)
{
	if (param != undefined)
	{
		entityos._scope.app.options = $.extend(true, entityos._scope.app.options.url, param)
	}
	else
	{
		return entityos._scope.app.options
	}
}

entityos.space =
{
    whoAmI: function (param)
    {
        var returnData = entityos._scope.space;
        returnData.isSwitched = entityos.space.isSwitched()

		return returnData
	},

	isSwitched: function (param)
    {
		return !(entityos._scope.space.contactbusiness == entityos._scope.user.contactbusiness)
	},

    switchInto: function (param, response)
    {
        if (response == undefined)
        {
            var id = entityos._util.param.get(param, 'id').value;
            var superUser = entityos._util.param.get(param, 'superUser', {default: false}).value;

            if (id != undefined)
            {
                var data =
                {
                    switch: 1,
                    id: id
                }

				if (superUser)
				{
					data.superuseroverride =  'Y'
				}

                entityos.cloud.invoke(
                {
                    method: 'core_space_manage',
                    data: data,
                    callback: entityos.space.switchInto,
                    callbackParam: param
                });
            }
        }
        else
        {
            if (response.status == 'OK')
            {	
                entityos._scope.space =
                {
                    id: response.TargetSpace,
                    name: response.SpaceName,
                    contactbusiness: response.TargetUserContactBusiness,
                    contactperson: response.TargetUserContactPerson,
                    user: response.TargetUser,
                    roles: response.roles.rows
                }

                entityos._util.sendToView(
                {
                    from: 'entityos-space-switch',
                    status: 'switched-into',
                    message: entityos._scope.space.name
                });

                entityos._util.onComplete(param);
            }
        }
    },

    switchBack: function (param, response)
    {
        if (response == undefined)
        {
            //var spaceData = app.get({scope: 'space-switch-into'});

            var data =
            {
                switchback: 1
            }

            entityos.cloud.invoke(
            {
                method: 'core_space_manage',
                data: data,
                callback: entityos.space.switchBack,
                callbackParam: param
            })
        }
        else
        {
            if (response.status == 'OK')
            {	
                entityos._scope.space =
                {
                    id: entityos._scope.user.space,
                    name: entityos._scope.user.contactbusinesstext,
                    contactbusiness: entityos._scope.user.contactbusiness,
                    contactperson: entityos._scope.user.contactperson,
                    user: entityos._scope.user.id,
                    roles: entityos._scope.user.roles.rows
                }

                entityos._util.sendToView(
                {
                    from: 'entityos-space-switch',
                    status: 'switched-back',
                    message: entityos._scope.space.name
                });

                entityos._util.onComplete(param);
            }
        }
    }
}

entityos._util =
{
    hash:       function (param)
                {
                    if (_.isString(param))
                    {
                        param = {data: param}
                    }

                    var data = entityos._util.param.get(param, 'data', {remove: true, default: ''}).value;
                    var hashType = entityos._util.param.get(param, 'hashType').value;
                    var hashOutput = entityos._util.param.get(param, 'hashOutput').value;
                    var hashFunction;

                    if (hashType == undefined)
                    {
                        if (_.isFunction(window.hex_md5))
                        {
                            hashType = 'MD5';
                            hashFunction = hex_md5;
                        }
                        else if (_.has(window, 'CryptoJS.MD5'))
                        {
                            hashType = 'MD5';
                            hashOutput = 'hex';
                            hashFunction = window.CryptoJS.MD5;
                        }
                        else if (_.has(window, 'CryptoJS.SHA256'))
                        {
                            hashType = 'SHA256';
                            hashOutput = 'hex';
                            hashFunction = window.CryptoJS.SHA256;
                        }
                    }

                    hashType = hashType.toUpperCase();

                    if (hashType != undefined)
                    {
                        if (hashFunction == undefined)
                        {
                            if (_.has(window, 'CryptoJS'))
                            {
                                hashFunction = CryptoJS[hashType];
                                hashOutput = 'hex';
                            }
                            else if (_.isFunction(window.hex_md5) && (hashType == 'MD5'))
                            {
                                hashFunction = hex_md5;
                            }
                        }
                    }

                    var _return;

                    if (_.isFunction(hashFunction))
                    {
                        if (hashOutput != undefined)
                        {
                            _return = hashFunction(data).toString(CryptoJS.enc[hashOutput]);
                        }
                        else
                        {
                            _return = hashFunction(data);
                        }
                    }

                    return _return;
                },

	hex:
                {
                    to: function (textIn)
                    {
                        const encoder = new TextEncoder();
                        return Array
                            .from(encoder.encode(textIn))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join('')
                    },

                    from: function (hexIn)
                    {
                        var textOut = '';
                        for (var i = 0; i < hexIn.length; i += 2) {
                            var v = parseInt(hexIn.substr(i, 2), 16);
                            if (v) textOut += String.fromCharCode(v);
                        }
                        return textOut;
                    }  
                },

    format:    
                {
                    asUUID: function (text)
                    {
                        return text.substr(0,8) + '-' + text.substr(8,4) + '-' + text.substr(12,4) + '-' + text.substr(16,4) + '-' + text.substr(20);
                    }

                },
    
	sendToView: function(param)
				{
					entityos._scope.sentToView.unshift(param);

					if (entityos._scope.app.viewUpdate != undefined)
					{
						var _param;

						if (_.startsWith(param.from, 'entityos-'))
						{
							_param = _.cloneDeep(param);
							_param.from = _.replace(_param.from, 'entityos-', 'myds-');
						}

						if (_.isFunction(entityos._scope.app.viewUpdate))
						{
							entityos._scope.app.viewUpdate(param);

							if (_param != undefined)
							{
								entityos._scope.app.viewUpdate(_param);
							}
						}
						else if (entityos._scope.app.viewUpdate != undefined)
						{
							entityos._util.controller.invoke(entityos._scope.app.viewUpdate, param);

							if (_param != undefined)
							{
								entityos._util.controller.invoke(entityos._scope.app.viewUpdate, _param);
							}
						}
					};
				},

	doCallBack: function()
				{
					var param, callback, data;

					if (typeof arguments[0] != 'object')
					{
						callback = arguments[0]
						param = arguments[1] || {};
						data = arguments[2]
					}
					else
					{
						param = arguments[0] || {};
						callback = param.callback;
						data = arguments[1];
						delete param.callback;
					}

					if (callback != undefined)
					{
						if (param.callbackParam != undefined) {param = param.callbackParam}

						if (_.isFunction(callback))
						{
							callback(param, data)
						}
						else
						{
							if (_.has(entityos, '_util.controller.invoke'))
							{
								entityos._util.controller.invoke(
								{
									name: callback
								},
								param,
								data);
							}
							else
							{
								if (_.isFunction(app.controller[callback]))
								{
									app.controller[callback](param, data)
								}
							}
						}
					};
				},

	onComplete: function (param)
				{
					if (entityos._util.param.get(param, 'onComplete').exists)
					{
						var onComplete = entityos._util.param.get(param, 'onComplete').value;
	
						if (entityos._util.param.get(param, 'onCompleteWhenCan').exists)
						{
							param.onComplete = param.onCompleteWhenCan;
							delete param.onCompleteWhenCan;
						}	
						else
						{
							delete param.onComplete;
						}

						if (onComplete != undefined)
						{
							if (typeof(onComplete) == 'function')
							{
								onComplete(param);
							}
							else
							{
								if (_.has(entityos, '_util.controller.invoke'))
								{
									entityos._util.controller.invoke(
									{
										name: onComplete
									},
									param);
								}
								else
								{
									if (_.isFunction(app.controller[onComplete]))
									{
										app.controller[onComplete](param)
									}
								}
							}	
						}
					}
					else if (entityos._util.param.get(param, 'onCompleteWhenCan').exists)
					{
						var onCompleteWhenCan = entityos._util.param.get(param, 'onCompleteWhenCan').value;

						delete param.onCompleteWhenCan;
					
						if (typeof(onCompleteWhenCan) == 'function')
						{
							onCompleteWhenCan(param);
						}
						else
						{
							if (_.has(entityos, '_util.controller.invoke'))
							{
								entityos._util.controller.invoke(
								{
									name: onCompleteWhenCan
								},
								param);
							}
							else
							{
								if (_.isFunction(app.controller[onCompleteWhenCan]))
								{
									app.controller[onCompleteWhenCan](param)
								}
							}
						}	
					}
				},			

	loadScript: function (script)
				{
					var xhtmlHeadID = document.getElementsByTagName("head")[0]; 
					var oScript = document.createElement('script');
					oScript.type = 'text/javascript';
					oScript.src = script;
					xhtmlHeadID.appendChild(oScript);
				},			

	init:       function(param)
				{
					entityos._util.sendToView(
					{
						from: 'entityos-init',
						status: 'start'
					});

					entityos._scope.app.site = window.entityosSiteId;

					$.ajaxSetup(
					{
						cache: false,
						dataType: 'json',
						global: true
					});

					$(window).off('hashchange');

					$(window).on('hashchange', function()
					{
 						entityos._util.sendToView(
						{
							from: 'entityos-init',
							status: 'uri-changed',
							message: window.location.hash
						});
					});

					if (_.has(entityos, '_scope.app.options.authView'))
					{
						var uri = window.location.host;

						var optionsAuth;

						if (entityos._scope.app.options.authView.uris != undefined)
						{
							optionsAuth = _.find(entityos._scope.app.options.authView, function (auth)
							{
								return _.includes(auth.uris, uri)
							});
						}

						if (optionsAuth == undefined && _.has(entityos, '_scope.app.site')
								&& entityos._scope.app.site != undefined)
						{
							optionsAuth = _.find(entityos._scope.app.options.authView, function (auth)
							{
								return _.includes(auth.sites, entityos._scope.app.site)
							});
						}

						if (optionsAuth != undefined)
						{
							$('.entityos-signup, .myds-signup').addClass('d-none hidden');
							if (optionsAuth.signup == true)
							{
								$('.entityos-signup, .myds-signup').removeClass('d-none hidden');
							}

							$('.entityos-auth-info, .myds-auth-info').addClass('d-none hidden');
							if (optionsAuth.caption != undefined || optionsAuth.note != undefined)
							{
								$('.entityos-auth-info, .myds-auth-info').removeClass('d-none hidden');
							}

							$('.entityos-auth-info-caption, .myds-auth-info-caption').addClass('d-none hidden');
							if (optionsAuth.caption != undefined)
							{
								$('.entityos-auth-info-caption, .myds-auth-info-caption').html(optionsAuth.caption);
								$('.entityos-auth-info-caption, .myds-auth-info-caption').removeClass('d-none hidden');
							}
						
							$('.entityos-auth-info-note, .myds-auth-info-note').addClass('d-none hidden');
							if (optionsAuth.note != undefined)
							{
								$('.entityos-auth-info-note, .myds-auth-info-note').html(optionsAuth.note);
								$('.entityos-auth-info-note, .myds-auth-info-note').removeClass('d-none hidden');
							}
						}
					}

					if (entityos._objects == undefined && entityos._scope.app.options.objects)
					{	
						$.ajax(
						{
							type: 'GET',
							url: '/site/' + entityos._scope.app.site  + '/entityos.model.objects-1.0.0.json',
							dataType: 'json',
							success: 	function(data)
										{
											entityos._objects = data.objects;

											$.ajax(
											{
												type: 'GET',
												url: '/site/' + entityos._scope.app.site  + '/entityos.model.objects.properties-1.0.0.json',
												dataType: 'json',
												success: 	function(data)
															{
																$.each(data.objects, function (po, propertyobject)
																{
																	var object = $.grep(entityos._objects, function (object) {return object.name == propertyobject.name})[0];

																	if (object)
																	{
																		object.properties = propertyobject.properties;
																	}
																});

																entityos._util.init(param);
															},

												error: 		function(data)
															{
																entityos._util.init(param);
															}						
											});					
										},

							error: 		function(data)
										{
											entityos._objects = [];
											entityos._util.init(param);
										}			
						});
					}	
					else
					{	
						entityos._scope.app.objects = entityos._objects;

                        if (entityos._util.param.get(param, 'assistWithBehavior', {"default": false}).value)
						{
							entityos._util.loadScript('/jscripts/md5-min.js')
	
							$(document).on('click', '#entityos-logon, #myds-logon', function(event)
							{
								var logon = $('#entityos-logonname').val();
								if (logon == undefined) {logon = $('#myds-logonname').val()};

								var password = $('#entityos-logonpassword').val();
								if (password == undefined) {password = $('#myds-logonpassword').val()};

								var code = $('#entityos-logoncode').val();
								if (code == undefined) {code = $('#myds-logoncode').val()};

								entityos.auth(
								{
									logon: logon,
									password: password,
									code: code
								});
							});							
						}

						var callback = entityos._util.param.get(param, 'viewStart').value;

						if (entityos._scope.app.options.auth)
						{	
							$.ajax(
							{
								type: 'GET',
								url: '/rpc/core/?method=CORE_GET_USER_DETAILS',
								dataType: 'json',
								cache: false,
								global: false,
								success: function(data) 
								{
									entityos._util.sendToView(
									{
										from: 'entityos-init',
										status: 'end'
									});
									
									if (data.status === 'ER')
									{
										entityos._scope.session = _.assign(entityos._scope.session,
                                        {
                                            logonkey: data.logonkey,
                                        });

                                        if (_.isSet(data.samlidentityproviderid))
                                        {
                                            entityos._scope.session = _.assign(entityos._scope.session,
                                            {
                                                identityProvider:
                                                {
                                                    saml:
                                                    {
                                                        id: data.hashidentityproviderid,
                                                        name: data.samlidentityprovidername,
                                                        url: data.samlidentityproviderurl
                                                    }
                                                },
                                                serviceProvider:
                                                {
                                                    saml:
                                                    {
                                                        usernamepath: data.samlidentityproviderusernamepath
                                                    }
                                                }
                                            });
                                        }

										entityos._util.doCallBack(callback, {isLoggedOn: false});
									}
									else
									{
										entityos._scope.session = _.assign(entityos._scope.session,
										{
											logonkey: data.logonkey,
											sid: data.sid
										});

										entityos._scope.user = data;
										entityos._scope.user.id = data.user;

                                        entityos._scope.space =
                                        {
                                            id: entityos._scope.user.space,
                                            name: entityos._scope.user.spacename,
                                            contactbusiness: entityos._scope.user.spacecontactbusiness,
                                            contactperson: entityos._scope.user.spacecontactperson,
                                            user: entityos._scope.user.id,
                                            roles: entityos._scope.user.roles.rows
                                        }
										
										if (entityos._scope.user.roles.rows.length != 0 )
										{
											var role = entityos._scope.user.roles.rows[0].title.toLowerCase().replaceAll(' ', '-');
											entityos._scope.app.options.startURI = entityos._scope.app.options.startURI.replace('{{role}}', role);
											entityos._scope.app.options.startURIContext = entityos._scope.app.options.startURIContext.replace('{{role}}', role);
										}

										if (entityos._scope.route != undefined)
										{
											if (entityos._scope.route.target == undefined)
											{
												entityos._scope.route.target = entityos._scope.app.options.startURI;
											}
										}
										
										if (entityos._scope.app.options.logonSuffix != undefined)
										{
											entityos._scope.user.userlogonname = entityos._scope.user.userlogonname.replace(entityos._scope.app.options.logonSuffix, '')
										}

										param.isLoggedOn = true;

										if (entityos._scope.app.options.structures)
										{	
											entityos._util.structures.get();
										}
									
										if (entityos._scope.app.viewStart != undefined)
										{
											if (_.isFunction(entityos._scope.app.viewStart))
											{
												entityos._scope.app.viewStart(param);
											}
											else
											{
												if (_.isFunction(app.controller[entityos._scope.app.viewStart]))
												{
													app.controller[entityos._scope.app.viewStart](param)
												}
											}
										}
										else
										{
											entityos._util.doCallBack(callback, param);
										}	
									}		
								}
							});
						}	
						else
						{
							entityos._util.doCallBack(callback);
						}	
					}

					if (entityos._scope.app.options.location)
					{	
						entityos._util.location.get();
					}
				},					

	logon: 	{
					init:		function(param)
								{
									var logon, password, callback, code;

									entityos._util.sendToView(
									{
										from: 'entityos-logon-init',
										status: 'start'
									});

									if (typeof param == 'object')
									{	
										logon = entityos._util.param.get(param, 'logon').value;
										password = entityos._util.param.get(param, 'password').value;
										callback = entityos._util.param.get(param, 'callback').value;
										code = entityos._util.param.get(param, 'code').value;
									}
									else
									{
										logon = arguments[0];
										password = arguments[1];
										callback = arguments[2];
										code = arguments[3];
									}	

									if (entityos._scope.app.options.logonSuffix != undefined)
									{
										logon = logon + entityos._scope.app.options.logonSuffix;
										param.logon = logon;
									}

									if (entityos._scope.app.options.passwordSuffix != undefined)
									{
										password = password + entityos._scope.app.options.passwordSuffix;
										param.password = password;
									}

									if (entityos._scope.app.options.password != undefined && typeof window.s == 'function')
									{
										if (password.length < entityos._scope.app.options.password.minimumLength)
										{
											password = s.rpad(password,
																entityos._scope.app.options.password.minimumLength,
																entityos._scope.app.options.password.fill);
			
											param.password = password;
										}
									}	

									var data = 
									{
										method: 'LOGON_GET_USER_AUTHENTICATION_LEVEL',
										logon: logon
									};	

									if (_.has(entityos, '_scope.app.options.password.hashType'))
									{
										data.passwordhash = entityos._util.hash(
										{
											data: logon + password,
											hashType: entityos._scope.app.options.password.hashType
										});
									}
									else
									{
										data.passwordhash = entityos._util.hash(logon + password);
									}
									
									entityos._util.sendToView(
									{
										from: 'entityos-logon-init',
										status: 'start'
									});
										
									$.ajax(
									{
										type: 'POST',
										url: '/rpc/logon/',
										data: data,
										dataType: 'json',
										global: false,
										error: function ()
										{
											console.log('error')
										},
										success: function (data)
										{
											if (data.status === 'ER')
											{
												entityos._util.sendToView(
												{
													from: 'entityos-logon-send',
													status: 'error',
													message: 'Logon name or password is incorrect.'
												});

												entityos._util.doCallBack(callback, {status: 'ER'});
											}
											else 
											{		
												entityos._scope.session.logonkey = data.logonkey;

												entityos._util.sendToView(
												{
													from: 'entityos-logon-init',
													status: 'end'
												});

												entityos._scope.authenticationLevel = data.authenticationlevel;
												entityos._scope.authenticationDelivery = data.authenticationdelivery;
												entityos._scope.authenticationUsingAccessToken = data.authenticationusingaccesstoken;

												if (entityos._scope.authenticationLevel == 3 || entityos._scope.authenticationLevel == 4)
												{	
													if (entityos._scope.authenticationDelivery == 1 || entityos._scope.authenticationDelivery == 2)
													{
														entityos._util.sendToView(
														{
															from: 'entityos-logon-init',
															status: 'need-code',
															message: (data.authenticationdelivery==1?'email':'SMS')
														});

														var data = 
														{
															method: 'LOGON_SEND_PASSWORD_CODE',
															logon: logon
														};

														if (_.has(entityos, '_scope.app.options.password.hashType'))
														{
															data.passwordhash = entityos._util.hash(
															{
																data: logon + password + entityos._scope.session.logonkey,
																hashType: entityos._scope.app.options.password.hashType
															});
														}
														else
														{
															data.passwordhash = entityos._util.hash(logon + password + entityos._scope.session.logonkey);
														}

														entityos._util.sendToView(
														{
															from: 'entityos-logon-init',
															status: 'code-sent'
														});

														$.ajax(
														{
															type: 'POST',
															url: '/rpc/logon/',
															global: false,
															data: data,
															dataType: 'json',
															success: function (data)
															{
																entityos._util.sendToView(
																{
																	from: 'entityos-logon-init',
																	status: 'end'
																});

																if (data.status == 'ER')
																{	
																	entityos._util.sendToView(
																	{
																		from: 'entityos-logon-init',
																		status: 'error',
																		message: 'There is an issue with your user account (' + data.error.errornotes + ').'
																	});
				
																	entityos._util.doCallBack(callback, {status: 'error', message: data.error.errornotes});
																}
																else
																{
																	entityos._util.sendToView(
																	{
																		from: 'entityos-logon-init',
																		status: 'end'
																	});

																	entityos._scope.logonInitialised = true;
																	entityos._util.doCallBack(callback, {status: 'get2ndFactorCode', codeDelivery: entityos._scope.authenticationDelivery});
																}	
															}
														});
													}
													else
													{
														entityos._scope.logonInitialised = true;
														entityos._scope.needTOTPCode = true;

														if (entityos._scope.authenticationUsingAccessToken == 2)
														{
															var localAccessToken = app.invoke('util-local-cache-search',
															{
																persist: true,
																key: 'myds.access-token-' + window.btoa(logon)
															});

															if (localAccessToken != undefined)
															{
																entityos._scope.needTOTPCode = false
															}
														}
														
														if (entityos._scope.needTOTPCode)
														{
															entityos._util.sendToView(
															{
																from: 'entityos-logon-init',
																status: 'need-totp-code',
																message: entityos._scope.authenticationDelivery
															});
														}
														else
														{
															param = entityos._util.param.set(param, 'code', localAccessToken);
															entityos._util.logon.send(param);
														}
													}	
												}
												else
												{	
													entityos._util.logon.send(param);
												}
											}	
										}	
									});
								},

					send: 	function (param)
								{
									entityos._util.sendToView(
									{
										from: 'entityos-logon-send',
										status: 'start'
									});

									var authenticationLevel = entityos._scope.authenticationLevel;
									var authenticationDelivery = entityos._scope.authenticationDelivery;
									var logon = entityos._util.param.get(param, 'logon').value;
									var password = entityos._util.param.get(param, 'password').value;
									var code = entityos._util.param.get(param, 'code').value;
									var callback = entityos._util.param.get(param, 'callback').value;

									var data = 
									{
										method: 'LOGON',
										logon: logon,
										localtime: moment().format('D MMM YYYY HH:mm:ss')
									}	

									var passwordHashData;

									if (authenticationLevel == 1)
									{
										passwordHashData = logon + password;
									}
									else if (authenticationLevel == 2)
									{
										passwordHashData = logon + password + entityos._scope.session.logonkey;
									}
									else if (authenticationLevel == 3 || authenticationLevel == 4)
									{
										passwordHashData = logon + password + entityos._scope.session.logonkey + code;

										if (authenticationDelivery == 3)
										{
											data.passwordcode = code
										}
									}

									if (_.has(entityos, '_scope.app.options.password.hashType'))
									{
										data.passwordhash = entityos._util.hash(
										{
											data: passwordHashData,
											hashType: entityos._scope.app.options.password.hashType
										});
									}
									else
									{
										data.passwordhash = entityos._util.hash(passwordHashData);
									}
									
									entityos._util.sendToView(
									{
										from: 'entityos-logon-send',
										status: 'request-start'
									});
									
									$.ajax(
									{
										type: 'POST',
										url: '/rpc/logon/',
										data: data,
										global: false,
										dataType: 'json',
										error: function ()
										{
											console.log('error')
										},
										success: function (data)
										{		
											if (data.status == 'ER')
											{
                                                if (entityos._scope.authenticationLevel == 4 &&
                                                        data.error.errornotes == 'Invalid ip address')
                                                {
                                                    entityos._util.sendToView(
                                                    {
                                                        from: 'entityos-logon-init',
                                                        status: 'need-totp-code',
                                                        message: entityos._scope.authenticationDelivery
                                                    });
                                                }
                                                else
                                                {
                                                    var message = 'Logon name or password is incorrect.'

                                                    if (entityos._scope.authenticationDelivery == 3)
                                                    {
                                                        message = 'Logon name, password and/or code is incorrect.'
                                                    }

                                                    if (data.error.errornotes == 'LogonKey has not been requested')
                                                    {
                                                        message = 'There is an issue with your current browser session.  Please refresh the webpage and trying again.'
                                                    }

                                                    entityos._util.sendToView(
                                                    {
                                                        from: 'entityos-logon-send',
                                                        status: 'error',
                                                        message: message
                                                    });

                                                    entityos._util.doCallBack(callback, {status: 'ER'});
                                                }
											}
											else 
											{		
												entityos._util.sendToView(
												{
													from: 'entityos-logon-send',
													status: 'end'
												});

												entityos._scope.session = data;
											
												param.uri = entityos._scope.app.options.startURI;
												param.uriContext = entityos._scope.app.options.startURIContext;
												param.passwordstatus = data.passwordstatus;

												if (data.passwordstatus == 'EXPIRED')
												{
													param.uriContext = param.uriContext + '/passwordexpired';
													
													entityos._util.init(param);

													entityos._util.sendToView(
													{
														from: 'entityos-logon-send',
														status: 'password-expired'
													});
												}
												else
												{	
													entityos._util.init(param);
												}

											}
										}
									})
								}
				},

	param: 	{
					get: 		function(param, name, options)
								{
									if (param == undefined) {param = {}}
									if (options == undefined) {options = {}}
							
									var data = {exists: false, value: options.default};

									var passedName = _.clone(name);
									var split = options.split;
									var index = options.index;
									var remove = options.remove;	
									var set = options.set;
									var nameOK = param.hasOwnProperty(name);

									if (!nameOK)
									{
										name = name.toLowerCase()
										nameOK = param.hasOwnProperty(name)
									}
								
									if (nameOK)
									{
										if (param[name] != undefined) {data.value = param[name]};
										data.exists = true;

										if (index !== undefined && split === undefined) {split = '-'}

										if (split !== undefined)
										{
											if (param[name] !== undefined)
											{	
												data.values = param[name].split(split);

												if (index !== undefined)
												{
													if (index < data.values.length)
													{
														data.value = data.values[index];
													}
												}
											}	
										}	
									}

									if (remove) {delete param[passedName]};
									if (set) {param[passedName] = data.value};

									return data;
								},

					set: 		function(param, key, value, options)
								{
									var onlyIfNoKey = false;

									if (entityos._util.param.get(options, 'onlyIfNoKey').exists)
									{
										onlyIfNoKey = entityos._util.param.get(options, 'onlyIfNoKey').value
									}

									if (param === undefined) {param = {}}

									if (param.hasOwnProperty(key))
									{
										if (!onlyIfNoKey) {param[key] = value};
									}
									else
									{
										param[key] = value;
									}
										
									return param
								}									
				},

	logoff: 	function (param)
				{
					var uri = entityos._util.param.get(param, 'uri').value;
					var refresh = entityos._util.param.get(param, 'refresh', {"default": true}).value;

                    if (uri == undefined && _.has(entityos, '._scope.app.options.deauthURI'))
					{
					    uri = entityos._scope.app.options.deauthURI; //eg /deauth
					}

					if (uri == undefined)
					{
						uri = '/'
					}

					$.ajax(
					{
						type: 'POST',
						url: '/rpc/core/?method=CORE_LOGOFF',
						dataType: 'json',
						async: false,
						global: false,
						success: function (data)
						{
							entityos._scope.user = undefined;
							if (refresh) {window.location.href = uri};
						}
					});
				},
                                 
	send: 	    function(param)
				{
					var object = entityos._util.param.get(param, 'object').value;
					var data = entityos._util.param.get(param, 'data', {"default": {}}).value;
					var url = entityos._util.param.get(param, 'url').value;
					var type = entityos._util.param.get(param, 'type', {"default": 'POST'}).value;
					var mode = entityos._util.param.get(param, 'mode', {"default": 'send'}).value;
					var rf = entityos._util.param.get(param, 'rf', {"default": 'json'}).value;
					var managed = entityos._util.param.get(param, 'managed', {"default": true}).value;
					var noFormatting = entityos._util.param.get(param, 'noFormatting').value;
					var manageErrors = entityos._util.param.get(param, 'manageErrors', {default: true}).value;
					var callbackIncludeResponse = entityos._util.param.get(param, 'callbackIncludeResponse', {default: true}).value;
					var callbackResponseProcessController = entityos._util.param.get(param, 'callbackResponseProcessController').value;
					var set = entityos._util.param.get(param, 'set').value;
					var all = entityos._util.param.get(param, 'all', {default: false}).value;
					var isFormData = entityos._util.param.get(param, 'isFormData', {default: false}).value;

					var sameAsLastSeconds = 5;
					var sameAsLastCount = 1;
					var sameAsLastWarning = true;

					var logData = param;
					logData.when = moment();
					logData.uri = entityos._scope.app.uri;
					logData.uriContext = entityos._scope.app.uriContext;
					logData.lastInvokedController = entityos._util.controller.data.last;

					entityos._cloud.log.push(param);

					if (object != undefined)
					{
						object = object.toLowerCase();

						if (entityos._cloud.object[object] == undefined)
						{
							entityos._cloud.object[object] = {count: 1, fields: [], filters: []}
						}
						else
						{
							entityos._cloud.object[object].count = entityos._cloud.object[object].count + 1
						}

						entityos._cloud.object[object].logIndex = entityos._cloud.log.length - 1
					}

					if (entityos._scope.app.options.sendSameAsLast != undefined)
					{
						if (entityos._scope.app.options.sendSameAsLast.seconds != undefined)
						{
							sameAsLastSeconds = entityos._scope.app.options.sendSameAsLast.seconds
						}

						if (entityos._scope.app.options.sendSameAsLast.count != undefined)
						{
							sameAsLastCount = entityos._scope.app.options.sendSameAsLast.count
						}

						if (entityos._scope.app.options.sendSameAsLast.warning != undefined)
						{
							sameAsLastWarning = entityos._scope.app.options.sendSameAsLast.warning
						}
					}

					data.sid = entityos._scope.session.sid;
					data.logonkey = entityos._scope.session.logonkey;

					if (entityos._scope.data._send == undefined)
					{
						entityos._scope.data._send = {}
					}

					var encode = window.btoa;

					if (typeof(Base64) == 'object')
					{
						if (typeof(Base64.encode) == 'function')
						{
							encode = Base64.encode;
						}
					}

					var paramData = param.object + '-' + encode(String(JSON.stringify(param.data)).replace(/[\u00A0-\u2666]/g, function(c)
	     			{
						return '&#' + c.charCodeAt(0) + ';';
					}))

					if (paramData == entityos._scope.data._send.param)
					{
						if (moment().isBefore(entityos._scope.data._send.when.add(sameAsLastSeconds, 'seconds')))
						{
							entityos._scope.data._send.count = 
							entityos._scope.data._send.count + 1;
							entityos._scope.data._send.when = moment();

							if (manageErrors && entityos._scope.data._send.count > sameAsLastCount)
							{
								var sameAsLast = false;
								var message = 'Warning, this appears to be a repeated send to entityos.'

								if (!sameAsLastWarning)
								{
									sameAsLast = true;
									message = 'Not sent to entityos as same as the last send.'
								};

								entityos._util.sendToView(
								{
									from: 'entityos-send',
									status: 'error',
									message: message,
									data: _.clone(param)
								});

								entityos._util.log.add(
								{
									message: message,
									controller: 'entityos._util.send > ' + url,
									param: _.clone(param)
								});
							}
						}
					}
					else
					{
						entityos._scope.data._send.count = 1;
						entityos._scope.data._send.param = paramData;
						entityos._scope.data._send.when = moment();
					}

					if (managed & (data.criteria == undefined && url.toLowerCase().indexOf('_search') != -1))
					{
						data.criteria = entityos._util.search.init();
						data.criteria.fields.push({name: 'id'});
					}

					if (_.has(entityos, '_scope.app.options.noFormatting') && _.isUndefined(noFormatting))
					{
						noFormatting = entityos._scope.app.options.noFormatting
					}

					if (noFormatting)
					{
						if (!_.has(data.criteria, 'customoptions')) {data.criteria.customoptions = []}
						
						data.criteria.customoptions.push(
						{
							name: 'FormatDecimal',
							value: '2'
						});
					}

					if (object != undefined && data.criteria != undefined)
					{
						entityos._cloud.object[object].fields

						_.each(data.criteria.fields, function (field)
						{
							if (_.find(entityos._cloud.object[object].fields, field) == undefined)
							{
								entityos._cloud.object[object].fields.push(field)
							}
						});

						_.each(data.criteria.filters, function (filter)
						{
							if (_.find(entityos._cloud.object[object].filters, filter) == undefined)
							{
								entityos._cloud.object[object].filters.push(filter);
							}
						});
					}

					if (data.criteria != undefined)
					{	
						data.criteria = JSON.stringify(data.criteria);
						url = url + '&advanced=1&rf=' + rf.toLowerCase();
					}
				
					if (!sameAsLast)
					{
						if (mode == 'send')
						{	
							if (url.substr(0,1) == '/')
							{
								if (_.has(entityos._scope.app.options, 'url'))
								{
									url = entityos._scope.app.options.url + url;
								}

								if (_.has(entityos._scope.app.options, 'external'))
								{
									url = 'https://api.entityos.com' + url;
								}
							}

							entityos._util.sendToView(
							{
								from: 'entityos-send',
								status: 'start'
							});

							if (_.isObject(set) && data != undefined)
							{
								if (set.guid)
								{
									if (data.datareturn == undefined)
									{
										data.datareturn = 'guid';
									}
									else
									{
										data.datareturn = data.datareturn + ',guid';
									}
								}
							}

							$.ajax(
							{
								type: type,
								url: url,
								dataType: 'json',
								cache: false,
								data: data,
								contentType: (isFormData?false:undefined),
    							processData: (isFormData?false:undefined),
								global: manageErrors,
								error: function(response, status, xhr)
								{	
                                    entityos._util.sendToView(
                                    {
                                        from: 'entityos-send',
                                        status: 'end'
                                    });

                                    if (response.statusText == 'parsererror')
                                    {
                                        var cleanResponseText = String(response.responseText).replace(/[\u00A0-\u2666]/g, function(c)
                                        {
                                            return '&#' + c.charCodeAt(0) + ';';
                                        });
                        
                                        cleanResponseText = cleanResponseText.replace(/[\u0092]/g,'\'');
                                        cleanResponseText = cleanResponseText.replace(/[\u0002]/g,' ');
										cleanResponseText = cleanResponseText.replace(/\\/g,'\\\\');
                                        cleanResponseText = cleanResponseText.replace(/[^\x20-\x7E]/g, '');
										cleanResponseText = cleanResponseText.replace(/\\\\"/g,'\\"');

                                        response = JSON.parse(cleanResponseText);

										if (_.has(response, 'data.rows'))
										{
											mydigitalstructure._util.data.set(
											{
												scope: set.scope,
												context: set.context,
												name: set.name,
												value: response.data.rows
											});
										}

                                        entityos._util.doCallBack(param, response);
                                    }
                                    else
                                    {
                                        entityos._util.sendToView(
                                        {
                                            from: 'entityos-core',
                                            status: 'error',
                                            message: 'There is an error communicating with the cloud service.'
                                        });
                                    }
								},
								success: function(response, status, xhr) 
								{
									entityos._util.sendToView(
									{
										from: 'entityos-send',
										status: 'end'
									});
								
									if (callbackIncludeResponse)
									{
										if (managed && _.has(response.data, 'rows'))
										{
											if (entityos._scope.data._send.data == undefined)
											{
												entityos._scope.data._send.data = {}
											}

											if (entityos._scope.data._guids == undefined)
											{
												entityos._scope.data._guids = {}
											}

											if (param.object != undefined && entityos._scope.data._guids[param.object] == undefined)
											{
												entityos._scope.data._guids[param.object] = {}
											}

											_.each(response.data.rows, function (row)
											{
												_.each(row, function (value, field)
												{
													if (callbackResponseProcessController != undefined)
													{
														entityos._util.controller.invoke(callbackResponseProcessController, {value: value}, value)
													}
													else
													{
														row[field] = _.unescape(value);
													}

													if (param.object != undefined && field == 'guid')
													{
														entityos._scope.data._guids[param.object][value] = row['id']
													}
												})
											});

											if (entityos._scope.data._send.data[response.moreid] == undefined)
											{
												entityos._scope.data._send.data[response.moreid] = response.data.rows
											}
											else
											{
												entityos._scope.data._send.data[response.moreid] = 
													_.concat(entityos._scope.data._send.data[response.moreid], response.data.rows)
											}
										}

										if (all && response.morerows == 'true')
										{
											param.url = '/rpc/core/?method=CORE_MORE_SEARCH'
											param.data = {id: response.moreid, startrow: _.size(entityos._scope.data._send.data[response.moreid])}
											entityos._util.send(param)
										}
										else
										{
											if (_.has(entityos._util.data, 'set') && typeof(set) == 'object')
											{
												if (_.has(response, 'data.rows'))
												{
													entityos._util.data.set(
													{
														scope: set.scope,
														context: set.context,
														name: set.name,
														value: response.data.rows
													});
												}

												if (_.has(response, 'id'))
												{
													if (set.context == undefined) {set.context = 'id'}

													entityos._util.data.set(
													{
														scope: set.scope,
														context: set.context,
														name: set.name,
														value: response.id
													});

													if (set.guid && data != undefined)
													{
														if (_.has(response, 'data.rows'))
														{
															data.guid = _.first(response.data.rows)['guid'];
															response.guid = data.guid;
														}
													}

													if (set.data && data != undefined)
													{
														data.id = response.id;
														delete data._id;
														delete data.logonkey;
														delete data.sid;
														delete data.datareturn;

														entityos._util.data.set(
														{
															scope: set.scope + '-' + response.id,
															value: data,
															merge: true
														});
													}
												}
											}

											if (all && _.has(response, 'data.rows'))
											{
												response.data.rows = entityos._scope.data._send.data[response.moreid];
											}

											entityos._util.doCallBack(param, response);
											if (_.has(entityos, '_scope.data._send.data'))
											{
												delete entityos._scope.data._send.data[response.moreid];
											}
										}
									}
									else
									{
										entityos._util.doCallBack(param);
									}

									if (response.status == 'OK' && param.notify != undefined)
									{
										entityos._util.sendToView(
										{
											from: 'entityos-send',
											status: 'notify',
											message: param.notify
										});
									}

									if (response.status == 'ER' && param.notifyError != undefined)
									{
										entityos._util.sendToView(
										{
											from: 'entityos-send',
											status: 'notify',
											message: param.notifyError
										});
									}
								},
								_managed: this.managed,
								_rf: this.rf
							});
						}
						else if (mode.toLowerCase() == 'log')
						{
							entityos._util.log.add(
							{
								message: data,
								controller: 'entityos._util.send > ' + url
							})
						}
						else
						{
							entityos._util.doCallBack(param);
						}
					}	
				},

	search:  {	
					init: function ()
					{
						var criteria = 
						{
							"fields": [],
							"summaryFields": [],
							"filters": [],
							"sorts": [],
							"options": {},
							"customoptions": []
						}

						return criteria
					},

					comparisons:
					[
						{title: "None", code: "", dataType: "all", inputCount: 0},
						{title: "Equal to", code: "EQUAL_TO", dataType: "all", inputCount: 1},
						{title: "Not equal to", code: "NOT_EQUAL_TO", dataType: "all", inputCount: 1},
						{title: "Greater than", code: "GREATER_THAN", dataType: "all", inputCount: 1},
						{title: "Greater than or equal to", code: "GREATER_THAN_OR_EQUAL_TO", dataType: "all", inputCount: 1},
						{title: "Less than", code: "LESS_THAN", dataType: "all", inputCount: 1},
						{title: "Less than or equal to", code: "LESS_THAN_OR_EQUAL_TO", dataType: "all", inputCount: 1},
						{title: "Is in list", code: "IN_LIST", dataType: "all", inputCount: 1},
						{title: "Not in list", code: "NOT_IN_LIST", dataType: "all", inputCount: 1},
						{title: "Never set", code: "IS_NULL", dataType: "all", inputCount: 0},
						{title: "Has been set", code: "IS_NOT_NULL", dataType: "all", inputCount: 0},
						{title: "Approximately equal to", code: "APPROX_EQUAL_TO", dataType: "all", inputCount: 1},
						{title: "Contains", code: "TEXT_IS_LIKE", dataType: "text", inputCount: 1},
						{title: "Does Not Contain", code: "TEXT_IS_NOT_LIKE", dataType: "text", inputCount: 1},
						{title: "Starts with", code: "TEXT_STARTS_WITH", dataType: "text", inputCount: 1},
						{title: "Is empty", code: "TEXT_IS_EMPTY", dataType: "text", inputCount: 0},
						{title: "Is not empty", code: "TEXT_IS_NOT_EMPTY", dataType: "text", inputCount: 0},
						{title: "Today", code: "TODAY", dataType: "date", inputCount: 0},
						{title: "Yesterday", code: "YESTERDAY", dataType: "date", inputCount: 0},
						{title: "Between", code: "BETWEEN", dataType: "date", inputCount: 2},
						{title: "Week to date", code: "WEEK_TO_DATE", dataType: "date", inputCount: 0},
						{title: "Month to date", code: "MONTH_TO_DATE", dataType: "date", inputCount: 0},
						{title: "Calendar year to date", code: "CALENDAR_YEAR_TO_DATE", dataType: "date", inputCount: 0},
						{title: "Calendar last week", code: "CALENDAR_LAST_WEEK", dataType: "date", inputCount: 0},
						{title: "Calendar next week", code: "CALENDAR_NEXT_WEEK", dataType: "date", inputCount: 0},
						{title: "Calendar last month", code: "CALENDAR_LAST_MONTH", dataType: "date", inputCount: 0},
						{title: "Calendar next month", code: "CALENDAR_NEXT_MONTH", dataType: "date", inputCount: 0},
						{title: "Calendar last year", code: "CALENDAR_LAST_YEAR", dataType: "date", inputCount: 0},
						{title: "Calendar next year", code: "CALENDAR_NEXT_YEAR", dataType: "date", inputCount: 0},
						{title: "End of last month", code: "END_OF_LAST_MONTH", dataType: "date", inputCount: 0},
						{title: "End of next month", code: "END_OF_NEXT_MONTH", dataType: "date", inputCount: 0},
						{title: "Last 52 weeks", code: "LAST_52_WEEKS", dataType: "date", inputCount: 0},
						{title: "In month", code: "IN_MONTH", dataType: "date", inputCount: 1},
						{title: "On day and month", code: "ON_DAY_MONTH", dataType: "date", inputCount: 1},
						{title: "This month", code: "THIS_MONTH", dataType: "date", inputCount: 0},
						{title: "Next month", code: "NEXT_MONTH", dataType: "date", inputCount: 0},
						{title: "Aged 30 days", code: "AGED_THIRTY", dataType: "date", inputCount: 0},
						{title: "Aged 60 days", code: "AGED_SIXTY", dataType: "date", inputCount: 0},
						{title: "Aged 90 days", code: "AGED_NINETY", dataType: "date", inputCount: 0},
						{title: "Aged 90+ days", code: "AGED_NINETY_PLUS", dataType: "date", inputCount: 0},
						{title: "Last financial quarter", code: "LAST_FINANCIAL_QUARTER", dataType: "date", inputCount: 0}
					]	
				},

	view: 	{
					get: 	function (uri)
							{
								if (typeof arguments[0] == 'object') {uri = arguments[0].uri;}

								if (entityos._scope.app.views != undefined)
								{	
									var view = $.grep(entityos._scope.app.views, function (view) {return view.uri==uri});
									if (view.length==1) {return view[0]}
								}		
							},

					render:
							function ()
							{
								var uri, uriContext;

								if (typeof arguments[0] == 'object')
								{
									uri = arguments[0].uri;
									uriContext = arguments[0].uriContext;
								}
								else
								{
									uri = arguments[0];
									uriContext = arguments[1];
								}

								if (uri == undefined) {uri = entityos._scope.app.options.startURI}

								if (entityos._scope.app.view == undefined) {entityos._scope.app.view = {}}
								if (uri != undefined) {entityos._scope.app.view.uri = uri}
								if (uriContext != undefined) {entityos._scope.app.view.uriContext = uriContext}

								var view = entityos._util.view.get(uri);

								if (uriContext != undefined && uriContext != '#')
								{
									if ($(uriContext).length != 0)
									{
										if (_.isEmpty($('#entityos-container')) && _.isEmpty($('#myds-container')))
										{
											$('div.entityos-view').addClass('hidden d-none');
											$('div.myds-view').addClass('hidden d-none');
											$(uriContext).removeClass('hidden d-none');
										}
										else
										{	
											var html = $(uriContext).clone();

											var id = 'entityos-container-' + html.attr('id');
											html.attr('id', id).removeClass('hidden d-none');
											$('#entityos-container').html(html);

											var id = 'myds-container-' + html.attr('id');
											html.attr('id', id).removeClass('hidden d-none');
											$('#myds-container').html(html);
										}	
									}
								}

								if (uriContext != entityos._scope.app.options.authURIContext
										&& entityos._scope.user == undefined)
								{		
									entityos._util.sendToView(
									{
										from: 'entityos-auth',
										status: 'error',
										message: 'not-authenticated'
									});	
								}
								else
								{
									if (view != undefined)
									{	
										entityos._scope.app.view.data = view;

										var access;

										if (view.roles != undefined)
										{
											access = false;

											$.each(view.roles, function (r, role)
											{
												if (!access)
												{	
													access = entityos._util.user.roles.has({role: role, exact: true});
												}	
											});
										}
										else
										{
											access = true
										}

										if (!access)
										{
											var deAuth = false;

											if (_.has(entityos, '_scope.app.options.routing.noAccess.deAuth'))
											{
												deAuth = entityos._scope.app.options.routing.noAccess.deAuth;
											}

											if (deAuth)
											{
												entityos.deauth();
											}
											else
											{
												if (_.has(entityos, '_scope.app.options.routing.noAccess.uri')
														|| _.has(entityos, '_scope.app.options.routing.noAccess.uriContext'))
												{
													entityos._util.sendToView(
													{
														from: 'entityos-auth',
														status: 'error',
														message: 'no-access',
														data: entityos._scope.app.routing.noAccess
													});
												}
												else
												{
													entityos._util.sendToView(
													{
														from: 'entityos-auth',
														status: 'error',
														message: 'no-access'
													});
												}
											}
										}
										else
										{	
											if (view.html != undefined)
											{
												$(entityos._scope.app.options.container).html(view.html);	
											}
											else if (view.selector != undefined)
											{
												$('div.entityos-view').addClass('hidden d-none');
												$('div.myds-view').addClass('hidden d-none');
												$(view.selector).removeClass('hidden d-none');
											}

											if (view.controller != undefined)
											{
												entityos._util.controller.invoke(view.controller);
											}
										}	
									}
									else
									{
										if (uri != undefined)
										{	
											var uriController = uri.replace('/', '');
											
											if (entityos._util.controller.exists(uriController))
											{
												entityos._util.controller.invoke(uriController);
											}
										}	
									}

									entityos._util.view.access(
									{
										view: entityos._scope.app.view.data,
										uriContext: uriContext
									});

									entityos._util.view.track(
									{
										view: entityos._scope.app.view.data,
										uri: uri,
										uriContext: uriContext
									});
								}	
							},

					access: function (param)
							{
								var view = entityos._util.param.get(param, 'view').value;
								var uriContext = entityos._util.param.get(param, 'uriContext').value;
								var viewContext = uriContext.replace('#', '');
								
								if (view != undefined)
								{	
									if (view.contexts != undefined)
									{	
										var contexts = $.grep(view.contexts, function (context) {return context.id==viewContext});
										var elements = [];
										var elementsShow = [];
										var access;

										$.each(contexts, function (v, context)
										{
											$.each(context.elements, function (e, element) {elements.push(element)});

											access = false;

											$.each(context.roles, function (r, role)
											{
												if (!access)
												{	
													access = entityos._util.user.roles.has({role: role, exact: true})
												}	
											});

											if (access) {$.each(context.elements, function (e, element) {elementsShow.push(element)});}
										});

										entityos._util.sendToView(
										{
											from: 'entityos-view-access',
											status: 'context-changed',
											message: {hide: elements, show: elementsShow}
										});
									}
								}	
							},

					track: function (param)
							{
								var view = entityos._util.param.get(param, 'view').value;
								var uri = entityos._util.param.get(param, 'uri').value;
								var uriContext = entityos._util.param.get(param, 'uriContext').value;
								var viewContext = uriContext.replace('#', '');
								var track = entityos._scope.app.options.track;
								var user = entityos._scope.user;
								var dataContext = _.get(param, 'dataContext');

								if (_.isObject(dataContext)) {dataContext = JSON.stringify(dataContext)}

								if (_.isUndefined(uri) && _.isObject(entityos._scope.app.view.data))
								{
									uri = entityos._scope.app.view.data.uri
								}

								if (track != undefined && user != undefined)
								{
									if (track.uri != undefined)
									{
										var data =
										{
											contactbusiness: user.contactbusiness,
											contactperson: user.contactperson,
											actionby: user.user,
											actiontype: track.uri.actiontype,
											actionreference: 'Tracking URI',
											description: uri + '/' + uriContext,
											status: 1,
											text: dataContext
										}

										entityos.create(
										{
											object: 'action',
											data: data
										})
									}
								}
							},				

					queue:
							{
								_util:
								{
									disable: function (selector, param)
									{
										$(selector).addClass('disabled');
									},

									enable: function (selector, param)
									{
										$(selector).removeClass('disabled');
									},

									hide: function (selector, param)
									{
										$(selector).addClass('d-none hidden');
									},

									show: function (selector, param)
									{
										$(selector).removeClass('d-none hidden');
									},

									userHasAccess: function (param)
									{
										var queue = entityos._util.param.get(param, 'queue').value;

										if (queue == undefined)
										{
											if (entityos._util.controller.data.last == undefined)
											{
												queue = entityos._scope.data.defaultQueue
											}
											else
											{
												queue = entityos._util.controller.data.last
											}
										}

										var userRoles = entityos._util.param.get(param, 'roles').value;
										if (userRoles == undefined)
										{
											userRoles = entityos._scope.viewQueue['roles'][queue]
										}

										if (userRoles == undefined) {userRoles = []}

										var userHasAccess = (userRoles.length == 0);
										
										if (!userHasAccess)
										{
											_.each(entityos._scope.viewQueue['roles'][queue], function (role)
											{
												if (!userHasAccess)
												{	
													userHasAccess = entityos._util.user.roles.has({role: role, exact: true})
												}	
											});
										}

										return userHasAccess;
									}
								},

								init: function (selector, param)
								{
									if (typeof selector == 'object')
									{
										param = _.clone(selector);
										selector = param.selector;
									}
									
									var working = entityos._util.param.get(param, 'working', {"default": false}).value;
									var clear = entityos._util.param.get(param, 'clear', {"default": true}).value;
									var type = entityos._util.param.get(param, 'type', {"default": 'content'}).value;
									var disableSelector = entityos._util.param.get(param, 'disable').value;
									var enableSelector = entityos._util.param.get(param, 'enabler').value;
									var queue = entityos._util.param.get(param, 'queue').value;
									var setDefault = entityos._util.param.get(param, 'setDefault', {"default": false}).value;
									setDefault = entityos._util.param.get(param, 'setDefault', {"default": false}).value;

									var userRoles = entityos._util.param.get(param, 'roles', {default: []}).value;

									if (queue == undefined)
									{
										if (entityos._util.controller.data.last == undefined)
										{
											queue = entityos._scope.data.defaultQueue
										}
										else
										{
											queue = entityos._util.controller.data.last
										}
									}

									if (setDefault)
									{
										entityos._scope.data.defaultQueue = queue;
									}

									entityos._scope.viewQueue['roles'][queue] = userRoles;

									var html = '';
									
									if (selector != undefined)
									{	
										if (working) {html = entityos._scope.app.options.working}
										$(selector).html(html);
									}

									if (clear) {entityos._util.view.queue.clear(param)};
									if (disableSelector) {entityos._util.view.queue._util.disable(disableSelector, param)};
									if (enableSelector) {entityos._util.view.queue._util.enable(enableSelector, param)};

									entityos._util.view.queue['_' + queue] = {};

									_.each(['add', 'apply', 'clear', 'focus', 'get', 'render', 'reset', 'show', 'templateRender', 'update', 'template'],
										function (method)
										{
											entityos._util.view.queue['_' + queue][method] = function ()
											{
												var applyArguments = [];

												_.each(arguments, function(argument, a)
												{
													if (a <= 1)
													{
														if (_.isObject(argument))
														{
															argument = _.assign(argument, {queue: queue})
														}
													}

													applyArguments.push(argument);
												});

												if (arguments.length == 1 && !_.isPlainObject(arguments[0]))
												{
													applyArguments.push({queue: queue});
												}
												else if (arguments.length == 0)
												{
													applyArguments.push({queue: queue});
												}

												return entityos._util.view.queue[method].apply(null, applyArguments);
											}
										});

									return entityos._util.view.queue['_' + queue];
								},

								reset: function (param)
								{
									param = entityos._util.param.set(param, 'clearDefault', true);
									entityos._util.view.queue.clear(param)
								},

								clear: function (param)
								{
									var type = entityos._util.param.get(param, 'type', {"default": 'content'}).value;
									var queue = entityos._util.param.get(param, 'queue', {"default": entityos._scope.data.defaultQueue}).value;
									var preserve = entityos._util.param.get(param, 'preserve', {"default": false}).value;
									var clearDefault = entityos._util.param.get(param, 'clearDefault', {"default": false}).value;
								
									if (clearDefault)
									{
										delete param.clearDefault;
										entityos._scope.data.defaultQueue = 'base';
									}

									if (!preserve)
									{
										entityos._scope.viewQueue[type][queue] = [];
										delete entityos._util.view.queue['_' + queue];
									};
								},

								template: function (content, param)
								{
									param = entityos._util.param.set(param, 'type', 'template')
								
									if (_.isArray(content))
									{
										content = _.join(content, '')
									}

									entityos._util.view.queue._add(content, param)
								},

								add: function (content, param)
								{
									var type = entityos._util.param.get(param, 'type', {"default": 'content'}).value;

									if (type == 'content')
									{
										if (_.isArray(content))
										{
											_.each(content, function (_content)
											{
												entityos._util.view.queue._add(_content, param)
											})
										}
										else
										{
											entityos._util.view.queue._add(content, param)
										}
									}
									else //template
									{
										if (_.isArray(content))
										{
											content = _.join(content, '')
										}

										entityos._util.view.queue._add(content, param)
									}
								},

								_add: function (content, param)
								{	
									if (typeof arguments[0] == 'object')
									{
										var arg1 = arguments[1];
										var arg0 = arguments[0];

										content = arg1;
										param = arg0;										
									}

									var controller = entityos._util.param.get(param, 'controller').value;
									var scope = entityos._util.param.get(param, 'scope').value;
									var type = entityos._util.param.get(param, 'type', {"default": 'content'}).value;
									var queue = entityos._util.param.get(param, 'queue').value;
									var clear = entityos._util.param.get(param, 'clear', {"default": false}).value;
									var useTemplate = entityos._util.param.get(param, 'useTemplate', {"default": false}).value;
									var ifNoneContent = entityos._util.param.get(param, 'ifNoneContent').value;
									var selector = entityos._util.param.get(param, 'selector').value;

									if (controller == undefined) {controller = scope}
										
									if (queue == undefined && controller != undefined)
									{
										queue = controller;
									}

									if (queue == undefined)
									{
										queue = entityos._scope.data.defaultQueue;
									}

									param = entityos._util.param.set(param, 'queue', queue);

									if (entityos._util.view.queue._util.userHasAccess(param))
									{
										if (content == undefined && ifNoneContent != undefined)
										{
											content = ifNoneContent;
										}

										if (content == undefined && type == 'template' && queue != undefined)
										{
											if ($('#_' + queue).length != 0)
											{
												content = $('#_' + queue).clone().html()
											}
										}

                                        if (content == undefined && type == 'template' && selector != undefined)
										{
											if ($(selector).length != 0)
											{
												content = $(selector).clone().html()
											}
										}
										
										if (clear || type == 'template')
										{
											entityos._util.view.queue.clear(param)
										}

										if (entityos._scope.viewQueue[type][queue] == undefined) {entityos._scope.viewQueue[type][queue] = []}

										if (useTemplate && type == 'content')
										{
											var data = $.extend(true, {}, content);

											if (entityos._scope.viewQueue['data'] == undefined) {entityos._scope.viewQueue['data'] = {}}
											entityos._scope.viewQueue['data'][queue] = data;

											content = entityos._util.view.queue.get({type: 'template', queue: param.queue});
											var keyData;

											for (var key in data)
									  		{
									     		if (data.hasOwnProperty(key))
									     		{
									     			if (data[key] == undefined)
									     			{
									     				data[key] = ''
									     			}

									     			if (data[key] == '')
										     		{
														content = s.replaceAll(content, '{{' + 'entityos-hide-if-empty-' + key.toLowerCase() + '}}', 'd-none');
										     			content = s.replaceAll(content, '{{' + 'entityos-hide-if-empty-' + key + '}}', 'd-none');
										     			content = s.replaceAll(content, '{{' + 'entityos-show-if-empty-' + key.toLowerCase() + '}}', '');
										     			content = s.replaceAll(content, '{{' + 'entityos-show-if-empty-' + key + '}}', '');

										     			content = s.replaceAll(content, '{{' + 'myds-hide-if-empty-' + key.toLowerCase() + '}}', 'd-none');
										     			content = s.replaceAll(content, '{{' + 'myds-hide-if-empty-' + key + '}}', 'd-none');
										     			content = s.replaceAll(content, '{{' + 'myds-show-if-empty-' + key.toLowerCase() + '}}', '');
										     			content = s.replaceAll(content, '{{' + 'myds-show-if-empty-' + key + '}}', '');
										     		}
										     		else
										     		{
														content = s.replaceAll(content, '{{' + 'entityos-hide-if-empty-' + key.toLowerCase() + '}}', '');
														content = s.replaceAll(content, '{{' + 'entityos-hide-if-empty-' + key + '}}', '');
														content = s.replaceAll(content, '{{' + 'entityos-show-if-empty-' + key.toLowerCase() + '}}', 'd-none');
														content = s.replaceAll(content, '{{' + 'entityos-show-if-empty-' + key + '}}', 'd-none');

										     			content = s.replaceAll(content, '{{' + 'myds-hide-if-empty-' + key.toLowerCase() + '}}', '');
										     			content = s.replaceAll(content, '{{' + 'myds-hide-if-empty-' + key + '}}', '');
										     			content = s.replaceAll(content, '{{' + 'myds-show-if-empty-' + key.toLowerCase() + '}}', 'd-none');
										     			content = s.replaceAll(content, '{{' + 'myds-show-if-empty-' + key + '}}', 'd-none');
										     		}

									     			keyData = String(data[key]);

													/*
													if (_.isFunction(filterXSS))
													{
														keyData = filterXSS(keyData);
													}
													*/

									     			content = s.replaceAll(content, '{{' + key.toLowerCase() + '}}', keyData);
									     			content = s.replaceAll(content, '{{' + key + '}}', keyData);

									     			/*
													 if (s != undefined)
									     			{
									     				content = s.unescapeHTML(content)
									     			}
													 */

									     			content = s.replaceAll(content, '{{~' + key.toLowerCase() + '}}', encodeURIComponent(keyData));
									     			content = s.replaceAll(content, '{{~' + key + '}}', encodeURIComponent(keyData));

									     			content = s.replaceAll(content, '{{#' + key.toLowerCase() + '}}', _.escape(keyData));
									     			content = s.replaceAll(content, '{{#' + key + '}}', _.escape(keyData));

													keyData = String(keyData).replace(/[\u00A0-\u2666]/g, function(c)
									     			{
														return '&#' + c.charCodeAt(0) + ';';
													});

									     			content = s.replaceAll(content, '{{!' + key.toLowerCase() + '}}', 'base64:' + btoa(keyData));
									     			content = s.replaceAll(content, '{{!' + key + '}}',  'base64:' + btoa(keyData));
									     		}
									     	}

									     	entityos._scope.viewQueue[type][queue].push(content);
										}	
										else
										{
											if (_.isArray(content))
											{
												content = _.join(content, '');
											}	

											entityos._scope.viewQueue[type][queue].push(content);
										}
									}
								},

								templateRender: function (selector, param, data, template)
								{
									if (typeof arguments[0] == 'object')
									{
										param = arguments[0];
										selector = (arguments.length>1?arguments[1]:param.selector);
										data = (arguments.length>2?arguments[2]:param.data);
										template = (arguments.length>3?arguments[3]:param.template);
									}

									if (param.queue == undefined)
									{
										param.queue = param.controller;
									}

									if (entityos._util.view.queue._util.userHasAccess(param))
									{
										if (selector == undefined && data != undefined)
										{
											if (data.id != undefined && param.queue != undefined)
											{
												selector = '#' + param.queue + '-' + data.id
											}
										}

										if (data != undefined)
										{
											var _data = {};

											for (var key in data)
									  		{
									     		if (data.hasOwnProperty(key))
									     		{
									     			selector = s.replaceAll(selector, '{{' + key.toLowerCase() + '}}', data[key]);
									     			selector = s.replaceAll(selector, '{{~' + key.toLowerCase() + '}}', _.escape(data[key]));
									     			
									     			_data[key] = data[key];
									     		
										     		if (data[key] == '')
										     		{
														_data['entityos-hide-if-empty-' + key] = 'd-none';
														_data['entityos-show-if-empty-' + key] = '';
										     			_data['myds-hide-if-empty-' + key] = 'd-none';
										     			_data['myds-show-if-empty-' + key] = '';
										     		}
										     		else
										     		{
										     			_data['entityos-hide-if-empty-' + key] = '';
										     			_data['entityos-show-if-empty-' + key] = 'd-none';
														_data['myds-hide-if-empty-' + key] = '';
										     			_data['myds-show-if-empty-' + key] = 'd-none';
										     		}
									     		}
									     	}
										}

										entityos._util.view.queue.reset(param)
										entityos._util.view.queue.add(template, {queue: param.queue, type: 'template', selector: selector});
										entityos._util.view.queue.add({queue: param.queue, useTemplate: true}, _data);
										entityos._util.view.queue.render(selector, {queue: param.queue}, _data);
										entityos._util.view.queue.focus(selector, {queue: param.queue});
									}
								},

								apply: function (param)
								{
									if (param != undefined)
									{
										if (param.queue == undefined) {param.queue = 'apply'}

										var template = param.template;
										var queue = param.queue;
										var data = param.data;

										entityos._util.view.queue.reset(param)
										app.vq.add(template, {queue: queue, type: 'template'});
										app.vq.add({queue: queue, useTemplate: true}, data);
										return app.vq.get({queue: queue});
									}
								},

								focus: function(selector, param)
								{
									var selector = $(selector);
									if (selector.length != 0)
									{
										var focusElement = selector.find('.entityos-setfocus:first');

										if (focusElement.length == 0)
										{
											focusElement = selector.find('.myds-setfocus:first');
										}

										if (focusElement.length == 0)
										{
											focusElement = selector.find('input:first');
										}

										if (focusElement.length != 0)
										{
											focusElement.focus()
										}
									}
								},

								render: function (selector, param, data, template)
								{
									if (typeof arguments[0] == 'object')
									{
										param = arguments[0];
										selector = (arguments.length>1?arguments[1]:param.selector);
										data = (arguments.length>2?arguments[2]:param.data);
										template = (arguments.length>3?arguments[3]:param.template);
									}

									if (!_.isUndefined(template))
									{
										entityos._util.view.queue.templateRender(selector, param, data, template)
									}
									else
									{
										var type = entityos._util.param.get(param, 'type', {"default": 'content'}).value;
										var queue = entityos._util.param.get(param, 'queue').value;
										var append = entityos._util.param.get(param, 'append', {"default": false}).value;
										var appendSelector = entityos._util.param.get(param, 'appendSelector', {"default": 'table tr:last'}).value;
										var disableSelector = entityos._util.param.get(param, 'disable').value;
										var enableSelector = entityos._util.param.get(param, 'enable').value;
										var includeDates = entityos._util.param.get(param, 'includeDates', {"default": true}).value;
										var setInputs = entityos._util.param.get(param, 'setInputs', {"default": true}).value;
										var hideSelector = entityos._util.param.get(param, 'hide').value;
										var showSelector = entityos._util.param.get(param, 'show').value;

										if (queue == undefined)
										{
											queue = entityos._util.param.get(param, 'controller', {"default": entityos._scope.data.defaultQueue}).value;
										}

										if (data == undefined)
										{
											data = entityos._scope.viewQueue['data'][queue];
										}
											
										if (entityos._util.view.queue._util.userHasAccess(param))
										{
											if (selector == undefined)
											{
												console.log(entityos._scope.viewQueue[type][queue].join(''));
											}
											else
											{
												if (entityos._scope.viewQueue[type][queue] != undefined)
												{	
													var html = entityos._scope.viewQueue[type][queue].join('');

													if (append)
													{
														if (_.eq($(selector + ' table').length, 0))
														{
															$(selector).after(html);
														}
														else if ($(selector + ' ' + appendSelector).length != 0 )
														{
															$(selector + ' ' + appendSelector).after(html);
														}
													}
													else
													{
														$(selector).html(html);

														if (_.isObject(data))
														{
															if (_.isObject(data.sort))
															{
																$(selector).find('th[data-sort="' + data.sort.name + '"]').attr('data-sort-direction', data.sort.direction)
															}
														}
													}	
												}

												if (disableSelector != undefined) {entityos._util.view.queue._util.disable(disableSelector, param)};
												if (enableSelector != undefined) {entityos._util.view.queue._util.enable(enableSelector, param)};

												if (hideSelector != undefined) {entityos._util.view.queue._util.hide(hideSelector, param)};
												if (showSelector != undefined) {entityos._util.view.queue._util.show(showSelector, param)};
			
												if (includeDates)
												{
													entityos._util.view.datepicker({selector: '.entityos-date:visible, .myds-date:visible', format: 'D MMM YYYY'})
													entityos._util.view.datepicker({selector: '.entityos-date-time:visible, .myds-date-time:visible', format: 'D MMM YYYY LT'})
												}

												if (setInputs && _.isObject(data))
												{
													_.each($(selector + ' input.entityos-check[data-context][data-id], ' +
																selector + ' input.myds-check[data-context][data-id]'), function (element)
													{
														var context = $(element).data('context');
														var value = data[context];

														if (value != undefined)
														{
															$(selector + ' input.entityos-check[data-context="' + context + '"][data-id="' + value + '"], ' +
																selector + ' input.myds-check[data-context="' + context + '"][data-id="' + value + '"]').attr('checked', 'checked');
														}
													});
												}

												entityos._util.view.queue.reset(param);
											}
										}
									}	
								},

								update: function (content, param)
								{	
									if (typeof arguments[0] == 'object')
									{
										var arg1 = arguments[1];
										var arg0 = arguments[0];

										content = arg1;
										param = arg0;										
									}

									var queue = entityos._util.param.get(param, 'queue').value;
									var useTemplate = entityos._util.param.get(param, 'useTemplate', {"default": false}).value;
									var id = entityos._util.param.get(param, 'id').value;
									var selector = entityos._util.param.get(param, 'selector').value;
									var element = $(selector + ' tr[data-id="' + id + '"]');

									if (param.queue == undefined)
									{
										param.queue = entityos._util.param.get(param, 'controller', {"default": entityos._scope.data.defaultQueue}).value;
									}

									if (entityos._util.view.queue._util.userHasAccess(param))
									{
										if (useTemplate)
										{
											var data = $.extend(true, {}, content);
											content = entityos._util.view.queue.get({type: 'template', queue: param.queue});
											if (_.isUndefined(id)) {id = data.id}

											for (var key in data)
									  		{
									     		if (data.hasOwnProperty(key))
									     		{
									     			content = s.replaceAll(content, '{{' + key.toLowerCase() + '}}', data[key]);
									     			content = s.replaceAll(content, '{{' + key + '}}', data[key]);

									     			if (s != undefined)
									     			{
									     				content = s.unescapeHTML(content)
									     			}

									     			content = s.replaceAll(content, '{{~' + key.toLowerCase() + '}}', _.escape(data[key]));
									     			content = s.replaceAll(content, '{{~' + key + '}}', _.escape(data[key]));
									     		}
									     	}
									     	
									     	element.html(content)
										}	
										else
										{
											element = $(selector + ' tr[data-id="' + id + '"]');
											element.html(content)
										}	
									}
								},

								get: function (param)
								{
									var type = entityos._util.param.get(param, 'type', {"default": 'content'}).value;
									var queue = entityos._util.param.get(param, 'queue').value;
									
									if (queue == undefined)
									{
										queue = entityos._util.param.get(param, 'controller', {"default": entityos._scope.data.defaultQueue}).value;
										param = entityos._util.param.set(param, 'queue', queue);
									}

									if (entityos._util.view.queue._util.userHasAccess(param))
									{
										var content = entityos._scope.viewQueue[type][queue];

										if (!_.isUndefined(content))
										{
											content = content.join('');
										}

										if (type == 'content') {entityos._util.view.queue.clear(param)};

										return content	
									}
								},

								show: function (selector, content, param)
								{
									if (typeof arguments[0] == 'object')
									{
										param = arguments[0];
										selector = (arguments.length>1?arguments[1]:param.selector);
										content = param.content;
									}

									entityos._util.view.queue.clear(param);
									entityos._util.view.queue.add(content, param);
									entityos._util.view.queue.render(selector, param);
								},

								exists: function (param)
								{
									var type = entityos._util.param.get(param, 'type', {"default": 'data'}).value;
									var queue = entityos._util.param.get(param, 'queue').value;

									if (queue == undefined)
									{
										queue = entityos._util.param.get(param, 'controller', {"default": entityos._scope.data.defaultQueue}).value;
									}

									return (entityos._scope.viewQueue[type][queue].length!=0);
								}
							}			
				},

	register: 
				{
					space:
					{
						create: function (param)
								{
									var manageErrors = entityos._util.param.get(param, 'manageErrors', {default: false}).value;

									entityos._util.sendToView(
									{
										from: 'entityos-register-space',
										status: 'start'
									});

									var data = $.extend(true, {}, param);
									delete data.callback;

									data.registration_emailapplysystemtemplate = param.registration_emailapplysystemtemplate || 'N';
									data.registration_emaildocument = param.emaildocument || param.registration_emaildocument;
									data.registration_notes = param.notes || param.registration_notes;
									data.registration_trial = param.trial || param.registration_trial;
									data.registration_spacename = param.spacename || data.registration_spacename;
									data.registration_memberships = param.memberships || data.registration_memberships;
                                    data.registration_verifycode = param.verifycode || data.registration_verifycode;
                                    data.registration_verifymessage = param.verifymessage || data.registration_verifymessage;
                                    
									data.contactperson_firstname = param.firstname || param.contactperson_firstname;
									data.contactperson_surname = param.surname || param.contactperson_surname;
									data.contactperson_email = param.email || param.contactperson_email;
                                    data.contactperson_mobile = param.mobile || param.contactperson_mobile;

									data.template_businessname = data.contactbusiness_tradename;
									data.template_firstname = data.contactperson_firstname;
									data.template_surname = data.contactperson_surname;

                                    if (data.site == undefined)
                                    {
                                        data.site = window.entityosSiteId;
                                    }
									
                                    if (data.site == undefined)
                                    {
                                        data.site = window.mydigitalstructureSiteId;
                                    }
                                    
									$.ajax(
									{
										type: 'POST',
										url: '/rpc/register/?method=REGISTER_SPACE_MANAGE',
										dataType: 'json',
										cache: false,
										data: data,
										global: manageErrors,
										success: function(response) 
										{
											entityos._util.sendToView(
											{
												from: 'entityos-register-space',
												status: 'end'
											});

											entityos._util.doCallBack(param, response);
										}
									});	
								}
							},	

					website:	
							{		
								templates:
										function (param, response)
										{
											if (entityos._scope.register ==  undefined)
												{entityos._scope.register = {website: {}}}

											if (entityos._scope.register.website.templates == undefined)
											{
												var siteID = entityosSiteId;

												if (entityos._scope.user != undefined)
												{	
													siteID = entityos._scope.user.site;
												}	

												$.ajax(
												{
													type: 'GET',
													url: '/site/' + siteID + '/entityos.framework.templates-1.0.0.json',
													dataType: 'json',
													global: false,
													success: function(data)
													{
														entityos._scope.register.website.templates = data.templates;
														entityos._util.register.website.templates(param);
													},
													error: function(data) {}
												});
											}
											else
											{
												entityos._util.sendToView(
												{
													from: 'entityos-register-templates',
													status: 'initialised'
												});

												entityos._util.doCallBack(param);
											}
										},		

								create: function (param)
										{
											//sdk - language
											//template - ui frame work
											//urls
											//headers

											//Get the default site and update as required.

											var templateName = entityos._util.param.get(param, 'templateName').value;

											if (entityos._scope.register ==  undefined)
												{entityos._scope.register = {website: {}}}

											entityos._util.sendToView(
											{
												from: 'entityos-register-app',
												status: 'start'
											});

											var paramSend = $.extend(true, param,
											{
												url: '/rpc/setup/?method=SETUP_SITE_SEARCH',
												callback: entityos._util.register.website.process
											});

											entityos._util.send(paramSend);
										},

								process:
										function (param, response)
										{
											var templateName = entityos._util.param.get(param, 'templateName').value;

											if (response.data.rows.length != 0)
											{
												param.siteID = response.data.rows[0].id;
											}	

											if (templateName != undefined)
											{
												param.callback = entityos._util.register.website.update;
												entityos._util.register.website.templates(param);
											}
											else
											{
												entityos._util.doCallBack(param)
											}
										},	

								update: function (param, response)
										{
											var siteID = entityos._util.param.get(param, 'siteID').value;
											var templateName = entityos._util.param.get(param, 'templateName').value;
											var template;

											var paramSend =
											{	
												url: '/rpc/setup/?method=SETUP_SITE_MANAGE',
												data: (param.data!=undefined?param.data:{})
											};

											if (siteID != undefined)
											{	
												paramSend.data.id = siteID;
											}	

											if (templateName != undefined && siteID == undefined)
											{
												template = $.grep(entityos._scope.register.website.templates, function (template)
																		{return template.name == templateName})[0];
											
												paramSend.data = $.extend(true, paramSend.data, template.data);
												
												for (var key in paramSend.data)
										  		{
										     		if (paramSend.data.hasOwnProperty(key))
										     		{
										     			paramSend.data[key] = _.escape(paramSend.data[key]);
										     		}
										     	}

												paramSend.callback = entityos._util.register.website.headers;
											}
											else
											{
												paramSend.callback = entityos._util.register.website.complete;
											}

											entityos._util.send(paramSend);
										},

								headers: 
										function (param)
										{
											//Create headers
											entityos._util.register.website.complete(param);
										},

								complete:
										function (param)
										{
											entityos._util.sendToView(
											{
												from: 'entityos-register-app',
												status: 'end'
											});
										}					
							}
				},

	user: 	{
					password: 	
							function (param, callback)
							{
								entityos._util.sendToView(
								{
									from: 'entityos-user-password',
									status: 'start'
								});

								var data = param;
								data.site = data.site || entityosSiteId;
							
								$.ajax(
								{
									type: 'POST',
									url: '/rpc/register/?method=SITE_USER_PASSWORD_MANAGE',
									dataType: 'json',
									cache: false,
									data: data,
									success: function(data) 
									{
										entityos._util.sendToView(
										{
											from: 'entityos-user-password',
											status: 'end'
										});

										entityos._util.doCallBack(callback, data);
									}
								});	
							},

					roles: 	{
								get: 
									function (param)
									{
										var aRoles;

										if (entityos._scope.user != undefined)
										{	
											aRoles = $.map(entityos._scope.user.roles.rows, function (row) {return row});
										}

										return aRoles;
									},

								has: 
									function (param)
									{
										var roleTitle = entityos._util.param.get(param, 'roleTitle').value;
										var role = entityos._util.param.get(param, 'role').value;
										var exact = entityos._util.param.get(param, 'exact', {"default": true}).value;

										var _role = {};

										if (_.isObject(role))
										{
											_role = role
										}
										else
										{
											if (role != undefined)
											{
												_role = _.assign(_role, {id: role});
											}

											if (roleTitle != undefined)
											{
												_role = _.assign(_role, {title: roleTitle});
											}
										}

										var hasRole = false;

										if (entityos._scope.user != undefined)
										{	
											if (_role != undefined)
											{
												hasRole = ($.grep(entityos._scope.user.roles.rows, function (row)
														{return (exact?row.title==_role.title:row.title.toLowerCase().indexOf(_role.title.toLowerCase())!=-1)}).length > 0);
											
												if (!hasRole)
												{
													hasRole = ($.grep(entityos._scope.user.roles.rows, function (row)
															{return row.id == _role.id}).length > 0);
												}
											}
										}

										return hasRole;
									}	
							}		
				},

	location: 	{
					get: 	function ()
							{
							    if (navigator.geolocation)
							    {
							        navigator.geolocation.getCurrentPosition(
							        				entityos._util.location.process,
							        				entityos._util.location.process,
							        				{
														enableHighAccuracy: true
							        				});
							    }
							    else
							    {
        							entityos._util.location.process();
        						}
        					},

        			process: 	
        					function (position)
							{
							    if (position != undefined)
							    {
							       	var data =
							       	{
							       		available: true,
							       		coords:
								       	{
								       		latitude: position.coords.latitude,
	    									longitude: position.coords.longitude
	    								}
    								}	
							    }
							    else
							    {
        							var data =
							       	{
							       		available: false
    								}	
        						}

        						entityos._scope.location = data;

    							entityos._util.sendToView(
								{
									from: 'entityos-util-location',
									status: 'end',
									message: data
								});
        					}
				},

	object:     {
					get: 	function (param)
							{
								var objectTitle = entityos._util.param.get(param, 'context', {index: 2, split: '/'}).value;
								if (objectTitle == undefined) {var objectTitle = entityos._util.param.get(param, 'objectTitle').value}

								entityos.retrieve(
								{
									object: 'setup_method',
									data:
									{
										criteria:
										{
											fields:
											[
												{name: 'object'},
												{name: 'objecttext'},
												{name: 'endpoint'},
												{name: 'endpointtext'},
												{name: 'title'},
												{name: 'notes'},
												{name: 'removeavailable'},
												{name: 'addavailable'},
												{name: 'unrestrictedaccess'},
												{name: 'unrestrictedloggedonaccess'},
												{name: 'updateavailable'},
												{name: 'useavailable'}
											],
											filters:
											[
												{
													name: 'objecttext',
													comparison: 'EQUAL_TO',
													value1: objectTitle
												}
											],
											options: {rows: 1000}
										}
									},
									callback: entityos._util.object.properties
								});	
							},		

					properties:
							function (param, response)
							{
								var objectTitle = entityos._util.param.get(param, 'context', {index: 2, split: '/'}).value;
								if (objectTitle == undefined) {var objectTitle = entityos._util.param.get(param, 'objectTitle').value}

								var includeProperties = entityos._util.param.get(param, 'includeProperties').value;

                                if (response == undefined)
                                {
                                    entityos.retrieve(
                                    {
                                        object: 'setup_method',
                                        data:
                                        {
                                            criteria:
                                            {
                                                fields:
                                                [
                                                    {name: 'object'},
                                                    {name: 'objecttext'},
                                                    {name: 'endpointtext'},
                                                    {name: 'title'},
                                                    {name: 'method.property.datalength'},
                                                    {name: 'method.property.datatype'},
                                                    {name: 'method.property.datatypetext'},
                                                    {name: 'method.property.mandatory'},
                                                    {name: 'method.property.notes'},
                                                    {name: 'method.property.searchendpoint'},
                                                    {name: 'method.property.searchmethod'},
                                                    {name: 'method.property.searchrelatedproperty'},
                                                    {name: 'method.property.title'}
                                                ],
                                                filters:
                                                [
                                                    {
                                                        name: 'objecttext',
                                                        comparison: 'EQUAL_TO',
                                                        value1: objectTitle
                                                    }
                                                ],
                                                options: {rows: 1000}
                                            }
                                        },
                                        callback: entityos._util.object.properties
                                    });
                                }
							}
				},

     structures:     
                {
					get: 	function (param, response)
							{
                                if (response == undefined)
                                {
                                    entityos.retrieve(
                                    {
                                        object: 'setup_structure',
                                        data:
                                        {
                                            criteria:
                                            {
                                                fields:
                                                [
                                                    {name: 'title'},
                                                    {name: 'reference'},
                                                    {name: 'notes'}
                                                ],
                                                options: {rows: 9999}
                                            }
                                        },
                                        callback: entityos._util.structures.get
                                    });	
                                }
                                else
                                {
                                    entityos._scope.data.structures = response.data.rows;

									_.each(entityos._scope.data.structures, function (structure)
									{
										structure.alias = _.snakeCase(structure.title);

										if (!_.startsWith(structure.alias, '_'))
										{
											structure.alias = '_' + structure.alias
										}
									});
                                }
							}
                },	

	attachment:
				{	
				 	select: function (param)
						 	{
						 		var context = entityos._util.param.get(param, 'context').value;
						 		var title = entityos._util.param.get(param, 'title', {"default": context}).value;
						 		var object = entityos._util.param.get(param, 'object', {"default": ''}).value;
						 		var objectcontext = entityos._util.param.get(param, 'objectcontext', {"default": ''}).value;
						 		var maxfiles = entityos._util.param.get(param, 'maxfiles', {"default": '1'}).value;
								var controller = entityos._util.param.get(param, 'controller', {"default": ''}).value;
								var buttonClass = entityos._util.param.get(param, 'buttonClass').value;

								if (buttonClass == undefined)
								{
									if (entityos._scope.app.options.styles != undefined)
									{
										buttonClass = entityos._scope.app.options.styles.buttonDefault;
									}

									if (buttonClass == undefined)
									{
										buttonClass = 'btn-default'
									}						
								}
			
						 		var html = 
						 			'<form style="display:inline-block" name="{{context}}-attach-container" ' +
						 				'action="/rpc/attach/?method=ATTACH_FILE" enctype="multipart/form-data" method="POST" ' +
						 				'target="{{context}}-attach-proxy" accept-charset="utf-8">' +
						                '<input type="hidden" name="maxfiles" id="{{context}}-attach-maxfiles" value="{{maxfiles}}">' +
						                '<input type="hidden" name="object" id="{{context}}-attach-object" value="{{object}}">' +
						                '<input type="hidden" name="objectcontext" id="{{context}}-attach-objectcontext" value="{{objectcontext}}">' +
						                '<input type="hidden" name="filetype0" id="{{context}}-attach-filetype0" value="">' +
						                '<input type="hidden" name="title0" id="{{context}}-attach-title0" value="{{title}}">' +
						                '<iframe style="display:none;" name="{{context}}-attach-proxy" id="{{context}}-attach-proxy" ' +
						                'class="entityos-util-attachment-upload, myds-util-attachment-upload" frameborder="0"></iframe>' +
						                '<div class="form-group center-block">' +
						                  '<div class="fileinput fileinput-new input-group" data-provides="fileinput"' +
											' data-controller="{{controller}}">' +
						                    '<div class="form-control" data-trigger="fileinput"><span class="fileinput-filename"></span></div>' +
						                    '<span class="input-group-addon btn {{buttonClass}} btn-file"><span class="fileinput-new">Select file</span><span class="fileinput-exists">Change</span>' +
						                    	'<input type="file" name="file0" id="{{context}}-attach-file0"></span>' +
						                    '<a href="#" class="input-group-addon btn {{buttonClass}} fileinput-exists" data-dismiss="fileinput">Remove</a>' +
						                  '</div>'
						                '</div>'
						              '</form>';

								html = s.replaceAll(html, '{{context}}', context);
								html = s.replaceAll(html, '{{title}}', title);
								html = s.replaceAll(html, '{{object}}', object);
								html = s.replaceAll(html, '{{objectcontext}}', objectcontext);
								html = s.replaceAll(html, '{{maxfiles}}', maxfiles);
								html = s.replaceAll(html, '{{controller}}', controller);
								html = s.replaceAll(html, '{{buttonClass}}', buttonClass);

								return html   
							}, 

					show: function (param)
							{
								var object = entityos._util.param.get(param, 'object').value;
								var objectContext = entityos._util.param.get(param, 'objectContext').value;
								var attachmentType = entityos._util.param.get(param, 'attachmentType', {'default': ''}).value;
								var context = entityos._util.param.get(param, 'context').value;
								var customHTML = entityos._util.param.get(param, 'customHTML', {"default": ''}).value;
								var URL = entityos._util.param.get(param, "url", {'default': '/rpc/attach/?method=ATTACH_FILE&rf=JSON'}).value;
								
								var maxFiles = entityos._util.param.get(param, 'maxFiles', {"default": 1}).value;
								var label = entityos._util.param.get(param, 'label', {"default": ''}).value;
								var inputs = entityos._util.param.get(param, 'inputs', {"default": []}).value;
								var inputParams = entityos._util.param.get(param, 'inputParams', {"default": []}).value;
								var publicType = entityos._util.param.get(param, 'publicType').value;
								var bucket = entityos._util.param.get(param, 'bucket').value;
								var image = entityos._util.param.get(param, 'image').value;
								var controller = entityos._util.param.get(param, 'buttonClass', {default: ''}).value;
								var buttonClass = entityos._util.param.get(param, 'buttonClass').value;

								if (buttonClass == undefined)
								{
									if (entityos._scope.app.options.styles != undefined)
									{
										buttonClass = entityos._scope.app.options.styles.buttonDefault;
									}

									if (buttonClass == undefined)
									{
										buttonClass = 'btn-default'
									}						
								}

								entityos._util.view.queue.clear({queue: 'attachments-select-template'})

								entityos._util.view.queue.add(
										'<form style="display:inline-block" name="' + context + '-attach-container" ' +
						 					'action="/rpc/attach/?method=ATTACH_FILE" enctype="multipart/form-data" method="POST" ' +
						 					'target="' + context + '-attach-proxy" accept-charset="utf-8">' +
						               '<input type="hidden" name="maxfiles" id="' + context + '}-attach-maxfiles" value="' + maxFiles + '">' +
											'<input type="hidden" name="object" id="' + context + '-attach-object" value="' + object + '">' +
											'<input type="hidden" name="objectcontext" id="' + context + '-attach-objectcontext" value="' + objectContext + '">',
										{queue: 'attachments-select-template'});
										
								if (bucket != undefined)
								{		
									entityos._util.view.queue.add('<input type="hidden" name="bucket" id="' + context + '-attach-bucket" value="' + bucket + '">',
										{queue: 'attachments-select-template'});
								}	

								for (var i = 0; i < maxFiles; i++) 	
								{
									entityos._util.view.queue.add('<input type="hidden" class="filetype" name="filetype' + i + '" id="' + context + '-attach-filetype' + i +
										'" value="' + attachmentType + '">',
										{queue: 'attachments-select-template'});
								}

								$.each(inputs, function ()
								{	
									entityos._util.view.queue.add('<input type="hidden" name="' + this + '" id="' + context + '-attach-' + this + '" value="">',
										{queue: 'attachments-select-template'});
								});

								for (var i = 0; i < maxFiles; i++) 	
								{
									$.each(inputParams, function ()
									{	
										entityos._util.view.queue.add('<input type="hidden" name="' + this.id + i +
											'" id="' + context + '-attach-' + this.id + i +
											'" value="' + (this.value || '') + '">',
											{queue: 'attachments-select-template'});
									});
								}

								if (publicType)
								{
									for (var i = 0; i < maxFiles; i++) 	
									{
										entityos._util.view.queue.add('<input type="hidden" name="publictype' + i + '" id="' + context + '-attach-' + publictype + i +
											'" value="' + publicType + '">',
											{queue: 'attachments-select-template'});
									}
								}	

								entityos._util.view.queue.add(customHTML,
											{queue: 'attachments-select-template'});
								
								if (label != '') 
								{
									entityos._util.view.queue.add(
										'<div id="' + context + '-attach-label" class="entityos-util-attach-label myds-util-attach-label" style="margin-bottom:10px;">' + label + '</div>',
										{queue: 'attachments-select-template'});
								}	
									
								for (var i = 0; i < maxFiles; i++) 	
								{
									if (typeof $.fn.fileinput == 'function')
									{
										entityos._util.view.queue.add(
										 	'<div class="form-group center-block">' +
						                  '<div class="fileinput fileinput-new input-group" data-provides="fileinput" ' +
													'data-controller="' + controller + '">' +
						                    	'<div class="form-control" data-trigger="fileinput"><span class="fileinput-filename"></span></div>' +
						                    	'<span class="input-group-addon btn ' + buttonClass + ' btn-file"><span class="fileinput-new">Select file</span><span class="fileinput-exists">Change</span>' +
						                    	'<input type="file" name="file0" id="' + context + '-attach-file0" class="' + context + '-attach-file"></span>' +
						                    	'<a href="#" class="input-group-addon btn ' + buttonClass + ' fileinput-exists" data-dismiss="fileinput">Remove</a>' +
						                  '</div>' +
						                '</div>',
						                {queue: 'attachments-select-template'});
									}
									else
									{
										entityos._util.view.queue.add(
												'<div id="' + context + '-attach-file-view' + i + '" style="padding:3px;">' +
												'<input class="' + context + '-attach-file" type="file" name="file' + i + '" id="' + context + '-attach-file' + i + '"' +
												(image?' accept="image/*" capture="camera"':'') + '></div>',
						                {queue: 'attachments-select-template'});
									}			
								}
	
								entityos._util.view.queue.add(
											'<iframe style="display:none;" name="' + context + '-attach-proxy" id="' + context + '-attach-proxy" class="entityos-util-attachment-upload myds-util-attachment-upload" frameborder="0"></iframe>' +
											'</form>',
						               {queue: 'attachments-select-template'});
								
								return entityos._util.view.queue.get({queue: 'attachments-select-template'});
							},
		      
		      	upload: function(param)
					{
						var functionValidate = entityos._util.param.get(param, 'functionValidate', {default: entityos._util.attachment.validate}).value;
						var directSubmit = entityos._util.param.get(param, 'directSubmit', {'default': true}).value;
						var context = entityos._util.param.get(param, 'context').value;
						var callback = (param && param.callback) ? param.callback : context + '-attachments-show';
						var reset = entityos._util.param.get(param, 'reset', {'default': false}).value;

						if (typeof $.fn['ajax' + (directSubmit?'Submit':'Form')] == 'function')
						{
							$('[name="' + context + '-attach-container"]')['ajax' + (directSubmit?'Submit':'Form')](
							{
								beforeSubmit: function()
								{
									return functionValidate(context);
								},

								beforeSend: function() 
								{
									$('#' + context + '-attach-status').html(
									'<div class="progress">' +
									'<div class="progress-bar" role="progressbar" style="width: 0%;" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div></div>');
								},

								uploadProgress: function(event, position, total, percentComplete) 
								{
									$('#' + context + '-attach-status [role="progressbar"]').css('width', percentComplete + '%');
								},

								success: function() 
								{
									$('#' + context + '-attach-status [role="progressbar"]').css('width', '100%');
								},

								complete: function(xhr) 
								{
									var response = JSON.parse(xhr.responseText);

									if (reset)
									{
										$('#' + context + '-attach-status').html('');
									}

									if (response.status == 'OK')
									{
										$.extend(param, {attachments: response.data.rows}, true);
										entityos._util.doCallBack(callback, param)
									}
									else
									{
										entityos._util.sendToView(
										{
											from: 'entityos-util-attachments-upload',
											status: 'error',
											message: response.error.errornotes
										});
									}
								} 			
							});
						}
						else
						{
							entityos._util.attachment._upload(param);
						}
					},

					validate: function(context)
					{
						var bValid = true;

						if ($.grep($('.' + context + '-attach-file'), function(x) {return $(x).val() != ''}).length == 0)
						{
							$('#' + context + '-attach-status')
								.html('<p>No files selected to upload.</p>');

							bValid = false;
						}

						return bValid;
					},

					dropzone: 
					{
						data: {},
						object: {},

						init: function (param)
						{
							//https://www.dropzonejs.com/#layout

							var selector = entityos._util.param.get(param, 'selector', {default: '#website-edit-files-edit-attach-container'}).value;
							var anywhere = entityos._util.param.get(param, 'anywhere', {default: false}).value;
							if (anywhere) {selector = 'document.body'}

							var name = entityos._util.param.get(param, 'name').value;
							if (name == undefined)
							{
								name = _.camelCase(selector)
							}

							var object = entityos._util.param.get(param, 'object').value;
							var objectContext = entityos._util.param.get(param, 'objectContext').value;
							var previewTemplate = entityos._util.param.get(param, 'previewTemplate').value;
							var selectors = entityos._util.param.get(param, 'selectors', {default: {}}).value;
							var autoQueue = entityos._util.param.get(param, 'autoQueue').value;
							var url = entityos._util.param.get(param, 'url', {default: '/rpc/attach/?method=ATTACH_FILE'}).value;
							var filetype = entityos._util.param.get(param, 'filetype').value;
							var fileUploadedController = entityos._util.param.get(param, 'fileUploadedController').value;
							var removeFileOnUpload = entityos._util.param.get(param, 'removeFileOnUpload', {default: true}).value;
							var callback = entityos._util.param.get(param, 'callback').value;
                            var autoUpload = entityos._util.param.get(param, 'autoUpload', {default: true}).value;

                            var message = entityos._util.param.get(param, 'message').value;
							if (message == undefined)
							{
								message = '<strong>Drop files here or click to select. </strong>';
                                
                                if (!autoUpload)
                                {
                                    message = messsage + '</br><span class="text-muted">(Then click Upload)</span>';
                                }
							}

							entityos._util.attachment.dropzone.data[name] = param;
							entityos._util.attachment.dropzone.data[name]['files'] = {added: [], uploaded: [], errors: []}

							//delete entityos._util.attachment.dropzone.object[name];
							if (false)
							{
								$(selector + ' button.dz-button').remove();
								$(selector + ' .dz-message').remove();
							}

							if (previewTemplate == undefined)
							{
								previewTemplate = [
									'<div class="col-lg-6">',
										'<div class="panel panel-default">',
											'<div class="panel-heading">',
												'<div class="dz-filename">',
													'<span data-dz-name></span>',
												'</div>',
											'</div>',
											'<div class="panel-body">',
												'<div class="progress m-b-0 active">',
					                       	'<div data-dz-uploadprogress class="progress-bar progress-bar-success" style="width: 0%" role="progressbar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>',
					                   	'</div>',
												'<div class="dz-error-message"><span data-dz-errormessage></span></div>',
											'</div>',
										'</div>',
									'</div>']
							}

							if (_.isArray(previewTemplate)) {previewTemplate = _.join(previewTemplate, '')}

							var options = 
							{	
								paramName: 'file0',
								thumbnailWidth: 80,
								thumbnailHeight: 80,
								parallelUploads: 1,
								autoProcessQueue: false,
								dictDefaultMessage: message,
								previewTemplate: previewTemplate
							}

							if (selectors.preview != undefined)
							{
								options.previewsContainer = selectors.preview
							}

							if (selectors.selectFiles != undefined)
							{
								options.clickable = selectors.selectFiles
							}

							if (url != undefined)
							{
								options.url = url
							}

							if (autoQueue != undefined)
							{
								options.autoQueue = autoQueue
							}

                            if (autoUpload != undefined)
							{
								options.autoProcessQueue = autoUpload
							}

							var bucket = entityos._util.param.get(param, 'bucket').value;
							var attachmentType = entityos._util.param.get(param, 'attachmentType').value;
							if (attachmentType==undefined) {attachmentType = entityos._util.param.get(param, 'type').value}
							var publicType = entityos._util.param.get(param, 'publicType').value;
							var inputParams = entityos._util.param.get(param, 'inputParams').value;
							if (inputParams==undefined) {inputParams = entityos._util.param.get(param, 'data', {default: []}).value}

							//if (entityos._util.attachment.dropzone.object[name] == undefined)
							if (true)
							{
								entityos._util.attachment.dropzone.object[name] = new Dropzone(selector, options);

								entityos._util.attachment.dropzone.object[name].on('sending', function(file, xhr, formData)
								{
									formData.append('object', object);
									formData.append('objectcontext', objectContext);

									if (bucket != undefined)
									{
										formData.append('bucket', bucket);
									}

									if (attachmentType != undefined)
									{
										formData.append('filetype0', attachmentType);
									}

									if (publicType != undefined)
									{
										formData.append('publictype0', publicType);
									}

									_.each(inputParams, function (inputParam)
									{	
										formData.append((inputParam.id!=undefined?inputParam.id:inputParam.name) + '0', inputParam.value);
									});

									var scope = entityos._util.param.get(param, 'scope').value;
									var data = app.get({scope: scope + '-upload'});
									if (data != undefined)
									{
										if (data.type != undefined) {formData.append('type0', data.type)}
									}
								});

								entityos._util.attachment.dropzone.object[name].on('addedfile', function(file)
								{
									entityos._util.attachment.dropzone.data[name]['files']['added'].push({file: file});

									file.previewElement.addEventListener('click', function()
									{
										entityos._util.attachment.dropzone.object[name].removeFile(file);
									});

									if (fileUploadedController != undefined)
									{
										entityos._util.controller.invoke(fileUploadedController, param, file);
									}
								});

								if (selectors.overallProgess != undefined)
								{
									entityos._util.attachment.dropzone.object[name].on('totaluploadprogress', function(progress)
									{
										$(selectors.overallProgess + ' .progress-bar').style.width = progress + '%';
									});
								}

								entityos._util.attachment.dropzone.object[name].on('error', function(file, errorMessage, xhr)
								{
									entityos._util.attachment.dropzone.data[name]['files']['errors'].push({file: file, error: errorMessage, response: xhr});

									entityos._util.sendToView(
									{
										from: 'entityos-util-attachments-upload',
										status: 'error',
										message: response.error.errornotes
									});
								});

								entityos._util.attachment.dropzone.object[name].on('success', function(file, response)
								{
                                    if (response.status == 'OK')
                                    {
                                        entityos._util.attachment.dropzone.data[name]['files']['uploaded'].push({file: file, response: response});

                                        if (removeFileOnUpload)
                                        {
                                            entityos._util.attachment.dropzone.object[name].removeFile(file);
                                        }
                                    }
                                    else
                                    {
                                        if (response.error.errorcode == '1')
                                        {
											entityos._util.logoff();
                                        }
                                        else
                                        {
                                            entityos._util.sendToView(
                                            {
                                                from: 'entityos-util-attachments-upload',
                                                status: 'error',
                                                message:  response.error.errornotes
                                            });
                                        }
                                    }
								});
								
								entityos._util.attachment.dropzone.object[name].on('queuecomplete', function(progress)
								{
									if (selectors.overallProgess != undefined)
									{
										$(selectors.overallProgess).style.opacity = '0';
									}

									param = entityos._util.param.set(param, 'attachments',
										_.map(entityos._util.attachment.dropzone.data[name]['files']['uploaded'], function (uploaded)
													{return _.first(uploaded.response.data.rows)}))

									if (callback != undefined)
									{
										if (_.isFunction(callback))
										{
											callback(param, entityos._util.attachment.dropzone.data[name]);
										}
										else
										{
											entityos._util.controller.invoke(callback, param, entityos._util.attachment.dropzone.data[name]);
										}
									}
									
									entityos._util.onComplete(param, entityos._util.attachment.dropzone.data[name])
								});
							}
						}
					},

					_upload:	
							function (param)
							{
								entityos._scope.data.attachment = param;

								var context = entityos._util.param.get(param, 'context').value;
						 		var id = entityos._util.param.get(param, 'id').value;

						 		if (context != undefined && id != undefined)
						 		{
									$('#' + context + '-attach-objectcontext').val(id);
								}
								
								entityos._util.sendToView(
								{
									from: 'entityos-util-attachments-upload',
									status: 'start'
								});

								var frame = document.getElementById(entityos._scope.data.attachment.context + '-attach-proxy');
								if (frame == undefined)
								{
									entityos._scope.data.attachment.context = entityos._scope.data.attachment.context.replaceAll('entityos', 'myds');
									frame = document.getElementById(entityos._scope.data.attachment.context + '-attach-proxy');
								}
								frame.contentDocument.body.innerHTML = '';

								var form = document[entityos._scope.data.attachment.context + '-attach-container'];
							  	form.submit();
							 	entityos._util.attachment._status();
								entityos._scope.data.attachment.timer = setInterval('entityos._util.attachment._status()', 1000);
							},

					_status:		
							function ()
							{
								var frame = document.getElementById(entityos._scope.data.attachment.context + '-attach-proxy');
								var currentState;
									
								if (frame !== null)
								{	
									if (frame.readyState)
									{
										//IE
										currentState = frame.readyState;
									}
									else 
									{
										//FF
										if (frame.contentDocument.body.innerHTML.substring(0, 2) === 'OK') 
										{
											currentState = 'complete';
										}
										else 
										{
											currentState = frame.contentDocument.body.innerHTML;
										}
									}
								}	
							 
								if (currentState === 'complete') 
								{
									clearInterval(entityos._scope.data.attachment.timer);
									if (frame.readyState)
									{
										frame.readyState = false
									}
									else
									{
										frame.contentDocument.body.innerHTML = '';
									}

									entityos._util.sendToView(
									{
										from: 'entityos-util-attachments-upload',
										status: 'end'
									});

									entityos._util.doCallBack(entityos._scope.data.attachment.callback)
								}
							}
				}																		
}

entityos._util.svgToImage = function (param)
{
	if (!window.btoa) window.btoa = base64.encode
	if (!window.atob) window.atob = base64.decode

	var svgURI = entityos._util.param.get(param, 'svgURI').value;
	var svgContainerID = entityos._util.param.get(param, 'svgContainerID', {default: 'entityos-svg'}).value;
	var imageContainerSelector = entityos._util.param.get(param, 'imageContainerSelector').value;
	var attachmentLink = entityos._util.param.get(param, 'attachmentLink').value;
	var scale = entityos._util.param.get(param, 'scale', {default: 15}).value;
	var width = entityos._util.param.get(param, 'width', {default: 150}).value;
	var height = entityos._util.param.get(param, 'height', {default: 150}).value;
	var smoothing = entityos._util.param.get(param, 'smoothing', {default: true}).value;
	var imageHTMLTemplate = entityos._util.param.get(param, 'imageHTMLTemplate', {default: '<img src="{{src}}">'}).value;
	var base64 = entityos._util.param.get(param, 'base64', {default: false}).value;
	var serialise = entityos._util.param.get(param, 'serialise', {default: true}).value;
	var showSVGURI = entityos._util.param.get(param, 'showSVGURI', {default: false}).value;
	var svgData = entityos._util.param.get(param, 'svgData').value;
	var onRenderController = entityos._util.param.get(param, 'onRenderController').value;

	if (svgURI == undefined && attachmentLink != undefined)
	{
		svgURI = '/rpc/core/?method=CORE_IMAGE_SHOW&contenttype=image/svg%2Bxml&id=' + attachmentLink;
	}

	if (svgURI == undefined)
	{
		var svgElement;

		if (svgData == undefined)
		{
			if (serialise)
			{
				svgElement = document.getElementById(svgContainerID);
				if (svgContainerID == 'entityos-svg' && svgElement == null)
				{
					svgContainerID = 'myds-svg';
					svgElement = document.getElementById(svgContainerID);
				}
				svgData = (new XMLSerializer()).serializeToString(svgElement);
			}
			else
			{
				svgElement = $('#' + svgContainerID);
				if (svgContainerID == 'entityos-svg' && svgElement.length == 0)
				{
					svgContainerID = 'myds-svg';
					svgElement = $('#' + svgContainerID);
				}
				svgData = svgElement.html();
			}
		}
		else
		{
			svgData = svgData.replace('<?xml version=\'1.0\'?>', '');
		}

		if (base64)
		{
			svgURI = 'data:image/svg+xml;base64, ' + btoa(svgData);
		}
		else
		{
			svgURI = 'data:image/svg+xml;charset=utf8, ' + encodeURIComponent(svgData);
		}
	}
		
	if (svgURI != undefined)
	{
		if (showSVGURI)
		{
			if (imageContainerSelector != undefined)
			{
				$(imageContainerSelector).html('<img src="' + svgURI + '">');
			}
			else
			{
				$('#' + svgContainerID).after('<img src="' + svgURI + '">');
			}
		}
		else
		{
			var canvas = document.getElementById("canvas.entityos-image");

			if (canvas == null)
			{
				canvas = document.getElementById("canvas.myds-image");
			}

			if (canvas == null)
			{
				canvas = document.createElement('canvas');
			}

			var context = canvas.getContext("2d");

			canvas.width = width * scale;
			canvas.height = height * scale;

			if (smoothing)
			{
				context.mozImageSmoothingEnabled = true;
				context.msImageSmoothingEnabled = true;
				context.imageSmoothingEnabled = true;
			}
			
			var svgImage = new Image;
			svgImage.src = svgURI;
			svgImage.onload = function()
			{
				context.drawImage(svgImage, 0, 0);
				imageHTMLTemplate = imageHTMLTemplate.replace('{{src}}', canvas.toDataURL("image/png"));
				$(imageContainerSelector).html(imageHTMLTemplate);

				if (onRenderController != undefined)
				{
					entityos._util.controller.invoke(onRenderController, param);
				}
			};
		}
	}
}

entityos._util.svgAsImageWithStyles = function (param)
{
	param = entityos._util.param.set(param, 'onComplete', entityos._util.svgAsImage);
	entityos._util.imageGetStyles(param);
}

entityos._util.svgAsImage = function (param)
{
	if (!window.btoa) window.btoa = base64.encode
	if (!window.atob) window.atob = base64.decode

	var svgContainerID = entityos._util.param.get(param, 'elementSVGContainerID').value;
	if (svgContainerID == undefined)
	{
		svgContainerID = entityos._util.param.get(param, 'svgContainerID').value;
	}
	var svgSelector = entityos._util.param.get(param, 'svgSelector').value;

	if (svgSelector == undefined && svgContainerID != undefined)
	{
		svgSelector = '#' + svgContainerID
	}

	var imageContainerID = entityos._util.param.get(param, 'elementImageContainerID').value;
	if (imageContainerID == undefined)
	{
		imageContainerID = entityos._util.param.get(param, 'imageContainerID').value;
	}

	var imageContainerSelector = entityos._util.param.get(param, 'imageContainerSelector').value;

	if (imageContainerSelector == undefined && imageContainerID != undefined)
	{
		imageContainerSelector = '#' + imageContainerID
	}

	var imageHTMLTemplate = entityos._util.param.get(param, 'imageHTMLTemplate', {default: '<img src="{{src}}">'}).value;

	var downloadContainerSelector = entityos._util.param.get(param, 'downloadContainerSelector').value;
	var downloadHTMLTemplate = entityos._util.param.get(param, 'downloadHTMLTemplate', {default: '<a download="image.png" href="{{src}}">'}).value;
	var download = entityos._util.param.get(param, 'download', {default: false}).value;

	var cssData = entityos._util.param.get(param, 'cssData').value;
	var styles = entityos._util.param.get(param, 'styles').value;

	if (styles == undefined && cssData != undefined)
	{
		styles = '<style type="text/css"><![CDATA[' + 
						'svg{' + cssData + '}' +
						']]></style>'
	}

	var set = entityos._util.param.get(param, 'setDefault').value;
	var smoothing = entityos._util.param.get(param, 'smoothing', {"default": false}).value;

	var viewScale = entityos._util.param.get(param, 'viewScale', {"default": 1}).value;
	var width = entityos._util.param.get(param, 'width', {"default": parseInt($(svgSelector).width()) * viewScale}).value;
	var height = entityos._util.param.get(param, 'height', {"default": parseInt($(svgSelector).height()) * viewScale}).value;
	
	var boxHeight = (parseInt(height) / viewScale);
	var boxWidth = (parseInt(width) / viewScale);

	var scale = entityos._util.param.get(param, 'scale', {"default": 15}).value;
	var clean = entityos._util.param.get(param, 'clean', {default: false}).value;

	if (clean && svgSelector != undefined)
	{
		entityos._util.svgClean(
		{
			svgSelector: svgSelector
		});
	}

	var svgHTML = $(svgSelector).html();
	var debug = entityos._util.param.get(param, 'debug', {default: false}).value;

	if (styles == undefined) {styles = ''}

	var html = '<svg viewBox="0 0 ' + boxWidth + ' ' + boxHeight + '" version="1.1" xmlns="http://www.w3.org/2000/svg" ' +
			'width="' + width +'" height="' + height + '" style="width:' + width + 'px; height:' + height + 'px;">' +
			styles + 
			svgHTML
			 + '</svg>';

	var svgDataURI = 'data:image/svg+xml;base64,' + btoa(html);
       	
	if (set != undefined)
	{
		entityos._util.data.set(_.assign(set, {value: svgDataURI}))
	}

	param = entityos._util.param.set(param, 'svgDataURI', svgDataURI);

	var canvas = entityos._util.param.get(param, 'canvas').value;

	if (canvas == undefined)
	{
		canvas = document.createElement('canvas');
	}

	canvas.width = width;
	canvas.height = height;

	var context = canvas.getContext("2d");

	if (smoothing)
	{
		context.mozImageSmoothingEnabled = true;
		context.msImageSmoothingEnabled = true;
		context.imageSmoothingEnabled = true;
	}

	if (debug)
	{
		console.log('imageToBase64Data SVG URI');
		console.log(svgDataURI);
	}
		
	var image = new Image;
  	image.src = svgDataURI;
  
 	image.onload = function()
 	{
		context.drawImage(image, 0, 0, width, height);

		var imageDataURI = canvas.toDataURL('image/png');

		if (set != undefined)
		{
			entityos._util.data.set(_.assign(set, {value: imageDataURI}))
		}

		param = entityos._util.param.set(param, 'imageDataURI', imageDataURI);

		if (imageContainerSelector != undefined)
		{
			imageHTMLTemplate = imageHTMLTemplate.replace('{{src}}', imageDataURI);
			$(imageContainerSelector).html(imageHTMLTemplate);
		}

		if (downloadContainerSelector != undefined)
		{
			downloadHTMLTemplate = downloadHTMLTemplate.replace('{{src}}', imageDataURI);
			$(downloadContainerSelector).html(downloadHTMLTemplate);
		}

		if (download)
		{
			entityos._util.downloadImage(_.assign({imageDataURI: imageDataURI}, param))
		}

		entityos._util.onComplete(param);
	};
}

entityos._util.svgToCanvas = function (param)
{
	var svgURI = entityos._util.param.get(param, 'svgURI').value;
	var svgContainerSelector = entityos._util.param.get(param, 'svgContainerSelector', {default: '#myds-svg'}).value;
	var canvasContainerID = entityos._util.param.get(param, 'svgContainerID', {default: 'myds-svg'}).value;
	var svgContainerID = entityos._util.param.get(param, 'svgContainerID').value;
	var convertUsing = 'SVG2Bitmap';

	svgContainerID = 'manufacturer-dashboard-devices-by-device-category';
	canvasContainerID = 'manufacturer-dashboard-devices-by-device-category_canvas';

	if (convertUsing == 'SVG2Bitmap')
	{
		if (window.SVG2Bitmap == undefined)
		{
			console.log('!ERROR: You need to include a reference to SVG2Bitmap.')
		}
		else
		{
			var svg = document.getElementById(svgContainerID).children[0];
			SVG2Bitmap(svg, document.getElementById(canvasContainerID));
		}
	}
	else
	{
		const canvas = document.querySelector('canvas');
		const ctx = canvas.getContext('2d');
	    
	   if (window.canvg == undefined)
		{
			console.log('!ERROR: You need to include a reference to canvg.')
		}
		else
		{
			v = canvg.Canvg.fromString(ctx, '<svg width="600" height="600"><text x="50" y="50">Hello World!</text></svg>');
			v.start();
		}
	}
}

entityos._util.htmlToImage = function (param)
{
	var htmlContainerID = entityos._util.param.get(param, 'htmlContainerID').value;
	var htmlContainerSelector = entityos._util.param.get(param, 'htmlContainerSelector').value;

	var imageContainerID = entityos._util.param.get(param, 'imageContainerID').value;

	var element;

	if (htmlContainerID != undefined)
	{
		element = document.getElementById(htmlContainerID);
	}
	else
	{
		element = document.querySelector(htmlContainerSelector);
	}

	if (window.html2canvas == undefined)
	{
		console.log('!ERROR: You need to include a reference to html2canvas.')
	}
	else
	{
		html2canvas(element, {useCORS: true, dpi: 144}).then(function(canvas)
		{
			var img = new Image();
			img.src = canvas.toDataURL('image/png');

			var elementImage = document.getElementById(imageContainerID);
			elementImage.append(img);

			img.onload = function ()
			{	
				entityos._util.onComplete(param)
			};
		});
	}
}

entityos._util.svgClean = function (param)
{
	var svgContainerID = entityos._util.param.get(param, 'svgContainerID').value;
	var svgSelector = entityos._util.param.get(param, 'svgSelector').value;

	if (svgSelector == undefined)
	{
		svgSelector = '#' + svgContainerID;
	}

	var nodes = document.querySelectorAll(svgSelector + ' *');
	
	for (var i = 0; i < nodes.length; ++i)
	{
		var elemCSS = window.getComputedStyle(nodes[i], null);
		nodes[i].removeAttribute('xmlns');
		nodes[i].style.fill = elemCSS.fill;
		nodes[i].style.fillOpacity = elemCSS.fillOpacity;
		nodes[i].style.stroke = elemCSS.stroke;
		nodes[i].style.strokeLinecap = elemCSS.strokeLinecap;
		nodes[i].style.strokeDasharray = elemCSS.strokeDasharray;
		nodes[i].style.strokeWidth = elemCSS.strokeWidth;
		nodes[i].style.fontSize = elemCSS.fontSize;
		nodes[i].style.fontFamily = elemCSS.fontFamily;
		//Finally, solution to embbed HTML in foreignObject https://stackoverflow.com/a/37124551
		if (nodes[i].nodeName === "SPAN")
		{
			nodes[i].setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
		}
	}
}

entityos._util.imageToBase64Data = function (param)
{
	var imageURI = entityos._util.param.get(param, 'imageURI').value;
	var imageType = entityos._util.param.get(param, 'imageType', {default: 'svg+xml'}).value;
	var attachmentLink = entityos._util.param.get(param, 'attachmentLink').value;
	var svgSelector = entityos._util.param.get(param, 'svgSelector', {default: '#entityos-svg'}).value;

	if (!_.contains(imageType, 'image/'))
	{
		imageType = 'image/' + imageType.toLowerCase()
	};

	var imageContainerSelector = entityos._util.param.get(param, 'imageContainerSelector', {default: '#entityos-image-show'}).value;
	var imageHTMLTemplate = entityos._util.param.get(param, 'imageHTMLTemplate', {default: '<img src="{{src}}">'}).value;

	var scale = entityos._util.param.get(param, 'scale', {default: 15}).value;
	var width = entityos._util.param.get(param, 'width', {default: 150}).value;
	var height = entityos._util.param.get(param, 'height', {default: 150}).value;
	var smoothing = entityos._util.param.get(param, 'smoothing', {default: true}).value;
	var clean = entityos._util.param.get(param, 'clean', {default: false}).value;
	var autoSetWidthHeight = entityos._util.param.get(param, 'autoSetWidthHeight', {default: false}).value; 
	
	var set = entityos._util.param.get(param, 'set').value;
	var controller = entityos._util.param.get(param, 'controller').value;

	var debug = entityos._util.param.get(param, 'debug', {default: false}).value;

	if (imageURI == undefined && attachmentLink != undefined)
	{
		imageURI = '/rpc/core/?method=CORE_IMAGE_SHOW&contenttype=' + encodeURIComponent(imageType) + '&id=' + attachmentLink;
	}

	if ($(svgSelector).length == 0)
	{
		svgSelector = '#myds-svg'
	}

	if ($(imageContainerSelector).length == 0)
	{
		imageContainerSelector = '#myds-image-show'
	}

	if (imageURI == undefined && svgSelector != undefined)
	{
		if (clean)
		{
			entityos._util.svgClean(
			{
				svgSelector: svgSelector
			});
		}

		var svgData = $(svgSelector).html();
		imageURI = 'data:image/svg+xml;base64,' + btoa(svgData);
	}

	if (debug)
	{
		console.log('imageToBase64Data SVG URI');
		console.log(imageURI);
	}

	if (imageURI != undefined)
	{
		var image = new Image;
		image.src = imageURI;

		image.onload = function()
		{
			var canvas = document.getElementById("canvas.entityos-image");

			if (canvas == null)
			{
				canvas = document.getElementById("canvas.myds-image");
			}

			if (canvas == null)
			{
				canvas = document.createElement('canvas');
			}

			var canvasContext = canvas.getContext("2d");

			if (smoothing)
			{
				canvasContext.mozImageSmoothingEnabled = true;
				canvasContext.msImageSmoothingEnabled = true;
				canvasContext.imageSmoothingEnabled = true;
			}

			if (autoSetWidthHeight)
			{
				height = image.height;
                width = image.width;
			}
		
			canvas.width = width * scale;
			canvas.height = height * scale;

			canvasContext.drawImage(image, 0, 0);

			var dataURI = canvas.toDataURL("image/png");

			if (set != undefined)
			{
				entityos._util.data.set(_.assign(set, {value: dataURI}))
			}

			if (imageHTMLTemplate != undefined && imageContainerSelector != undefined)
			{
				imageHTMLTemplate = imageHTMLTemplate.replace('{{src}}', dataURI);
				$(imageContainerSelector).html(imageHTMLTemplate);
			}

			if (controller != undefined)
			{
				entityos._util.controller.invoke(controller,
				{
					dataURI: dataURI
				});
			}

			param = entityos._util.param.set(param, 'dataURI', dataURI);

			if (debug)
			{
				console.log('imageToBase64Data PNG URI');
				console.log(dataURI);
			}
			
			entityos._util.onComplete(param);			
		};
	}
}

entityos._util.imageGetStyles = function (param)
{
	var cssURI = entityos._util.param.get(param, 'cssURI').value;
	var cssURIs = entityos._util.param.get(param, 'cssURIs', {default: []}).value;
	var cssURIIndex = entityos._util.param.get(param, 'cssURIIndex').value;

	if (cssURI != undefined)
	{
		cssURIs.push(cssURI);
	}

	if (cssURIIndex == undefined)
	{
		cssURIIndex = -1;
		param.cssData = '';
	}

	cssURIIndex = cssURIIndex + 1;
	param.cssURIIndex = cssURIIndex;

	if (cssURIIndex < cssURIs.length)
	{
		param.processCSSURI = cssURIs[cssURIIndex];	
		entityos._util._imageGetStyles(param)
	}
	else
	{
		entityos._util.onComplete(param);
	}
}

entityos._util._imageGetStyles = function (param)
{
	var processCSSURI = entityos._util.param.get(param, 'processCSSURI').value;

	if (processCSSURI != undefined)
	{
		$.ajax(
		{
			type: 'GET',
			url: processCSSURI,
			global: false,
			dataType: 'text',
			success: function(data)
			{
				param.cssData = param.cssData + ' ' + data;
				entityos._util.imageGetStyles(param);
			},
			error: function (error)
			{
				console.log(error)
			}
		});
	}
	else
	{
		entityos._util.onComplete(param);
	}
}

entityos._util.downloadImage = function (param, response)
{
	var local = entityos._util.param.get(param, 'local', {default: true}).value;
	var imageDataURI = entityos._util.param.get(param, 'imageDataURI').value;

	var imageContainerID = entityos._util.param.get(param, 'imageContainerID').value;
	var imageContainerSelector = entityos._util.param.get(param, 'imageContainerSelector').value;

	if (imageContainerSelector == undefined && imageContainerID != undefined)
	{
		imageContainerSelector = '#' + imageContainerID
	}

	var filename = entityos._util.param.get(param, 'filename',
			{"default": _.kebabCase(entityos._scope.user.spacename) + '-' + _.now() + '.png'}).value;

	if (local)
	{
		var aLink = document.createElement('a');
		aLink.download = filename;
		aLink.href = imageDataURI;
		aLink.dataset.downloadurl = ['image/png', aLink.download, aLink.href].join(':');
		document.body.appendChild(aLink);
		aLink.click();
		document.body.removeChild(aLink);
	}
}

entityos._util.convert =
{
	csvToJSON: function (param)
	{
		if (window.Papa != undefined)
		{
			var data = entityos._util.param.get(param, 'data').value;
			var response = entityos._util.param.get(param, 'response').value;
			var csv = data;

			if (response != undefined)
			{
				csv = response.data;
			}
			
			if (csv != undefined)
			{
				var papa = Papa.parse(sCSV, {header: true})

				if (response != undefined)
				{
					response.data = {rows: papa.data, errors: papa.errors, meta: papa.meta}
				}
			}
		}
		else
		{
			response = 'No parser (http://papaparse.com)'
		}

		return response
	},

	arrayToObject: function (param)
	{
		var data;
		var keyField = 'title';
		var valueField = 'id';
		var cleanKey = false;

		if (_.isPlainObject(param))
		{
			data = app._util.param.get(param, 'data').value;
			keyField = app._util.param.get(param, 'keyField', {default: keyField}).value;
			valueField = app._util.param.get(param, 'valueField', {default: valueField}).value;
			cleanKey = app._util.param.get(param, 'cleanKey', {default: false}).value;
		}
		else
		{
			data = param;
			
		}

		var returnObject = _.reduce(data , function(object, data)
		{
			var _keyFieldData = data[keyField];
			
			if (cleanKey)
			{
				_keyFieldData = _.kebabCase(_keyFieldData).toLowerCase()
			}

			object[_keyFieldData] = data[valueField]
			
			return object;
		}, {});

		return returnObject
	}

}	

entityos._util.log = 
{
	data: 		
	{
		controller: []
	},

	todo: function (message, controller)
	{
		entityos._util.log.add({todo: message, controller: controller});
	},

	add: function (param)
	{
		var message = entityos._util.param.get(param, 'message').value;
		var keep = entityos._util.param.get(param, 'keep').value;
		var build = entityos._util.param.get(param, 'build').value;
		var controller = entityos._util.param.get(param, 'controller').value;
		var controllerParam = entityos._util.param.get(param, 'param').value;
		var data = entityos._util.param.get(param, 'data').value;
		var todo = entityos._util.param.get(param, 'todo').value;

		if (keep == undefined)
		{
			if (entityos._scope.app.options.controller != undefined)
			{
				keep = (entityos._scope.app.options.controller.keep == true)
			}
		}

		if (keep == undefined)
		{
			keep = true
		}

		if (build == undefined)
		{
			build = (todo != undefined)
		}

		if (data == undefined && controller != undefined)
		{
			data = app.data[controller]
		}

		if (keep)
		{
			entityos._util.log.data.controller.push(
			{
				time: Date(),
				message: message,
				controller: controller,
				param: controllerParam,
				data: data
			});

			entityos._util.log.show({last: true})
		}

		if (build)
		{
			if (_.has(entityos, '_util.controller.data.build'))
			{
				if (entityos._util.controller.data.build[controller] == undefined)
				{
					entityos._util.controller.data.build[controller] = []
				}

				if (todo != undefined) {message = [{todo: todo}]};
				if (!_.isArray(message)) {message = [message]}

				entityos._util.controller.data.build[controller] = _.concat(
					entityos._util.controller.data.build[controller], message)
			}
		}
	},

	clear: function ()
	{
		entityos._util.log.controller = [];
	},

	show: function (param)
	{
		var last = entityos._util.param.get(param, 'last', {"default": false}).value;
		var controllerLog = entityos._util.log.data.controller;

		if (last)
		{
			controllerLog = controllerLog.splice(-1);
		}

		$.each(controllerLog, function (l, log)
		{
			if (window.console)
			{
				var message = '@entityosSDK';

				if (log.controller != undefined) {message = message + ' # ' + log.controller}

				if (log.message != undefined)
				{
					if (!_.isObject(log.message))
					{
						message = message + ' # ' + log.message
					}
				}
				
				console.log(message);

				if (_.isObject(log.message))
				{
					console.log(log.message);
				}

				if (log.param != undefined)
				{
					console.log(log.param);
				}

				if (log.data != undefined)
				{
					if (log.data != log.param)
					{
						console.log(log.data);
					}	
				}
			}
		});
	}
}

entityos.upload = entityos._util.attachment.upload;
entityos.cloud.upload = entityos.upload;

window.mydigitalstructure = window.entityos;