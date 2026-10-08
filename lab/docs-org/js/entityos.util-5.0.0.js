/*!
 * This work is licensed under a Creative Commons Attribution-ShareAlike 4.0 International License.
 * http://creativecommons.org/licenses/by-sa/4.0/
 * Requires: jQuery, /jscripts/md5-min.js
 * Based on https://entityos.cloud platform
 * boostrap 3 & 4
 */

 "use strict";

entityos.compatible = (typeof document.addEventListener == 'function');

if (_.isFunction(window.sprintf))
{
	_.mixin({format: window.sprintf})
}

if (_.isFunction(window.format))
{
	_.mixin({format: window.format})
}

if (_.startsWith(_.VERSION, '4'))
{	
	_.pluck = _.map;
	_.contains = _.includes;
}

_.replaceAll = function (str, from, to)
{
	var returnValue = str;

	if (str != undefined)
	{
		returnValue = str.replace(new RegExp(from, 'g'), to);
	}

  return returnValue;
}

_.templateSettings.interpolate = /{{([\s\S]+?)}}/g;

try
{
	entityos.saveAs = !!new Blob;
}
catch (e)
{
	entityos.saveAs = false
}

$(document).off('click', '.entityos-logoff, .myds-logoff').on('click', '.entityos-logoff, .myds-logoff', function(event)
{
	entityos.deauth();
});

if (entityos._util.view == undefined) {entityos._util.view = {}}
if (entityos._util.view.handlers == undefined) {entityos._util.view.handlers = {}}

entityos._util.view.handlers['entityos-logon'] = function (event)
{
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		var password = $('#entityos-logonpassword').val();
        if (password == undefined)
        {
            password = $('#myds-logonpassword').val();
        }

		if ($('#entityos-logonpassword').attr('data-password') != undefined)
		{
			password = $('#entityos-logonpassword').attr('data-password');
		}

        if ($('#myds-logonpassword').attr('data-password') != undefined)
		{
			password = $('#myds-logonpassword').attr('data-password');
		}

        var logon = $('#entityos-logonname').val();
        if (logon == undefined)
        {
            logon = $('#myds-logonname').val();
        }

        var code = $('#entityos-logoncode').val();
        if (code == undefined)
        {
            code = $('#myds-logoncode').val();
        }

		entityos.auth(
		{
			logon: logon,
			password: password,
			code: code
		});
	}
}

$(document).off('click', '#entityos-logon, .entityos-logon, #myds-logon, .myds-logon')
.on('click', '#entityos-logon, .entityos-logon, #myds-logon, .myds-logon', entityos._util.view.handlers['entityos-logon']);

entityos._util.view.handlers['entityos-register'] = function(event)
{
	var disabled = $(this).hasClass('disabled');

    if (!disabled)
	{
        var spacename = $('#entityos-spacename').val();
        if (spacename == undefined)
        {
            spacename = $('#myds-spacename').val();
        }

        var firstname = $('#entityos-firstname').val();
        if (firstname == undefined)
        {
            firstname = $('#myds-firstname').val();
        }

        var surname = $('#entityos-surname').val();
        if (surname == undefined)
        {
            surname = $('#myds-surname').val();
        }

        var email = $('#entityos-email').val();
        if (email == undefined)
        {
            email = $('#myds-email').val();
        }

        var notes = $('#entityos-notes').val();
        if (notes == undefined)
        {
            notes = $('#myds-notes').val();
        }

		entityos.register(
		{
			spacename: spacename,
			firstname: firstname,
			surname: surname,
			email: email,
			notes: notes
		});	
	}
}

$(document).off('click', '#entityos-register, .entityos-register, #myds-register, .myds-register')
.on('click', '#entityos-register, .entityos-register, #myds-register, .myds-register', entityos._util.view.handlers['entityos-register']);

entityos._util.view.handlers['entityos-logoncode'] = function(e)
{
    if (e.which === 13)
    {
    	var password = $('#entityos-logonpassword').val();
        if (password == undefined)
        {
            password = $('#myds-logonpassword').val();
        }

		if ($('#entityos-logonpassword').attr('data-password') != undefined)
		{
			password = $('#entityos-logonpassword').attr('data-password');
		}

        if ($('#myds-logonpassword').attr('data-password') != undefined)
		{
			password = $('#myds-logonpassword').attr('data-password');
		}

        var logon = $('#entityos-logonname').val();
        if (logon == undefined)
        {
            logon = $('#myds-logonname').val();
        }

        var code = $('#entityos-logoncode').val();
        if (code == undefined)
        {
            code = $('#myds-logoncode').val();
        }

		entityos.auth(
		{
			logon: logon,
			password: password,
			code: code
		});
    }
}

$(document).off('keypress', '#entityos-logonname, #entityos-logonpassword, #entityos-logoncode, #myds-logonname, #myds-logonpassword, #myds-logoncode')
.on('keypress', '#entityos-logonname, #entityos-logonpassword, #entityos-logoncode, #myds-logonname, #myds-logonpassword, #myds-logoncode', entityos._util.view.handlers['entityos-logoncode']);

entityos._util.view.handlers['entityos-enter'] = function(e)
{
    if (e.which == 13)
    {
    	var element = $(this);
        var routeToSelector = element.attr('data-on-enter-route-to');
        var selector = element.attr('data-on-enter');

        if (routeToSelector != undefined)
        {
            entityos._util.view.handlers['entityos-click']({currentTarget: $(routeToSelector)});
        }
        else
        {
            if (selector != undefined)
            {
                element = $(selector)
            }
           
            if (element.length != 0)
            {
                var controller = element.data('controller');
                var scope = element.data('scope');
                var disabled = element.hasClass('disabled');

                if (!disabled && controller != undefined)
                {  
                    var param = {}
                    var data = entityos._util.data.clean(element.data());
                    
                    if (data.context != undefined)
                    {
                        data[data.context] = data.id
                    }

                    param.dataContext = data;
                    entityos._scope.data[controller] = _.assign(entityos._scope.data[controller], data);

                    if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

                    if (scope != undefined)
                    {	
                        if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}};
                        entityos._scope.data[scope] = _.assign(entityos._scope.data[scope], data);
                    }

                    entityos._util.controller.invoke({name: controller}, param);
                }
            }
        }
    }
}

$(document).off('keypress', '.entityos-enter, .myds-enter')
.on('keypress', '.entityos-enter, .myds-enter', entityos._util.view.handlers['entityos-enter']);

entityos._util.view.handlers['entityos-click'] = function (event)
{
	//var element = $(this);
    var element = $(event.currentTarget);
	var id = element.attr('id');
	var controller = element.data('controller');
	var scope = element.data('scope');
	var disabled = element.hasClass('disabled');

	if (element.hasClass('list-group-item'))
	{
		element.closest('li').siblings().removeClass('active');
		element.closest('li').addClass('active');
	}

	if (!disabled)
	{
		var spinner = element.attr('data-spinner');

		if (spinner != undefined)
		{
			if (spinner == '') {spinner = 'html'}
			entityos._util.view.spinner.add({element: element, mode: spinner, controller: controller});
		}

		if (controller != undefined)
		{
			var param = {}

			if (entityos._scope.app.uriContext != undefined)
			{ 
				param.context = (entityos._scope.app.uriContext).replace('#', '')
			}

			var data = entityos._util.data.clean(element.data());
			
			if (data.context != undefined && data.id != undefined)
            //if (data.context != undefined)
			{
				data[data.context] = data.id
			}

			param.dataContext = data;
			entityos._scope.data[controller] = _.assign(entityos._scope.data[controller], data);

			if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

			if (scope != undefined)
			{	
				if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}};
				entityos._scope.data[scope] = _.assign(entityos._scope.data[scope], data);
			}

			entityos._util.controller.invoke({name: controller}, param);
		}
		else
		{
			if (id != '')
			{	
				if (entityos._util.controller.exists(id))
				{	
					var param = {}

					if (entityos._scope.app.uriContext != undefined)
					{ 
						param.context = (entityos._scope.app.uriContext).replace('#', '')
					}

					var data = entityos._util.data.clean(element.data());
					param.dataContext = data;
					entityos._scope.data[id] = _.assign(entityos._scope.data[id], data);

					if (entityos._scope.data[id] == undefined) {entityos._scope.data[id] = {}}
					entityos._util.controller(id, param);
				}
			}
		}	
	}
}

$(document).off('click', '.entityos-click, .myds, .myds-click')
.on('click', '.entityos-click, .myds, .myds-click', entityos._util.view.handlers['entityos-click']);

entityos._util.view.handlers['entityos-view-table-select-all'] = function (event)
{
	var element = $(this);
	var context = element.attr('data-context');

	if (context != undefined)
	{
		var inputs = $('[data-context="' + context + '"] input.entityos-view-table-select, ' +
							'[data-context="' + context + '"] input.myds-view-table-select')

		if (element.prop('checked')) 
		{
			inputs.prop('checked', true);
		}
		else
		{
			inputs.prop('checked', false);
		}
	}
}

$(document).off('click', '.entityos-view-table-select-all, .myds-view-table-select-all')
.on('click', '.entityos-view-table-select-all, .myds-view-table-select-all', entityos._util.view.handlers['entityos-view-table-select-all']);

entityos._util.view.handlers['entityos-navigate'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var target = $(this).data('target');
	var context = $(this).attr('data-context');
	var disabled = $(this).hasClass('disabled');
	var newWindow = $(this).hasClass('entityos-navigate-new-window');
    if (!newWindow)
    {
        newWindow = $(this).hasClass('myds-navigate-new-window');
    }

	if (!disabled)
	{
		if (controller == undefined) {controller = scope}

		if (controller == undefined && target != undefined)
		{
			controller = target.replace('#', '')
		}

		if (controller == undefined && $(this).attr('href') != undefined)
		{
			controller = $(this).attr('href').replace('#', '')
		}

		if (controller != undefined)
		{
			var routerElement = $('.entityos-router, .myds-router');

			if (routerElement.length > 0)
			{
				var element = routerElement.children('.btn');
				if (element.length == 0)
				{
					element = routerElement.children('.dropdown-toggle');
				}

				if (element.length > 0)
				{
					var textElement = element.siblings().find('[data-context="' + controller + '"]')

					if (textElement.length > 0)
					{
						var text = textElement.html();

						var elementText = element.find('span.dropdown-text');

						if (elementText.length != 0)
						{
							elementText.html(text)
						}
						else
						{
							element.html(text + ' <span class="caret"></span>');
						}	
					}
				}
			}

			var param = {}

			if (entityos._scope.app.uriContext != undefined)
			{ 
				param.context = (entityos._scope.app.uriContext).replace('#', '')
			}

			param.dataContext = entityos._util.data.clean($(this).data());
			entityos._scope.data[controller] = entityos._util.data.clean($(this).data());

			var locationHash = '#' + controller;

			if (context != undefined)
			{
				locationHash = locationHash + '/' + context
			}

			if (newWindow)
			{
				window.open(window.location.origin + window.location.pathname + locationHash);
			}
			else
			{
				window.location.hash = locationHash;
			}
		}
	}
}

$(document).off('click', '.entityos-navigate, .myds-navigate')
.on('click', '.entityos-navigate, .myds-navigate', entityos._util.view.handlers['entityos-navigate']);

entityos._util.view.handlers['entityos-navigate-to'] = function (event)
{
	var target = $(this).attr('target');
	if (target == undefined) {target = $(this).data('target')};
	var type = $(this).data('type');
	if (type == undefined) {type = 'tab'}
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		if (type == 'tab')
		{
			$('[href="' + target + '"]').tab('show')
		}
	}
}

$(document).off('click', '.entityos-navigate-to, .myds-navigate-to')
.on('click', '.entityos-navigate-to, .myds-navigate-to', entityos._util.view.handlers['entityos-navigate-to']);

entityos._util.view.handlers['entityos-invoke'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var target = $(this).data('target');
	var targetClass = $(this).data('target-class')
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		$(targetClass).addClass('hidden d-none');
		$(target).removeClass('hidden d-none');

		if (controller == undefined) {controller = scope}

		if (controller == undefined && target != undefined)
		{
			controller = target.replace('#', '')
		}

		if (controller != undefined)
		{
			var param = {dataContext: entityos._util.data.clean($(this).data())};
			entityos._scope.data[controller] = entityos._util.data.clean($(this).data());

			entityos._util.controller.invoke(
			{
				name: controller,
				controllerParam: param
			});
		}
	}
}

$(document).off('click', '.entityos-show, .entityos-invoke, .myds-show, .myds-invoke')
.on('click', '.entityos-show, .entityos-invoke, .myds-show, .myds-invoke', entityos._util.view.handlers['entityos-invoke']);

entityos._util.view.handlers['entityos-close'] = function (event)
{
	var context = $(this).data('context');
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		if (context == 'popover' && typeof $.fn.popover == 'function')
		{
			$('.popover:visible').popover("hide");
		}
	}
}

$(document).off('click', '.entityos-close, .myds-close')
.on('click', '.entityos-close, .myds-close', entityos._util.view.handlers['entityos-close']);

entityos._util.view.handlers['entityos-export-table'] = function(event)
{
	var context = $(this).data('context');
	var container = $(this).data('container');
	var filename = $(this).data('filename');
	var scope = $(this).data('scope');
	var disabled = $(this).hasClass('disabled');
	var beforeExportController = $(this).attr('data-before-export-controller');

	if (!disabled)
	{
		entityos_util.controller.invoke('util-export-table',
		{
			context: context,
			filename: filename,
			container: container,
			scope: scope,
			beforeExportController: beforeExportController
		});
	}
}

$(document).off('click', '.entityos-export, .entityos-export-table, .myds-export, .myds-export-table')
.on('click', '.entityos-export, .entityos-export-table, .myds-export, .myds-export-table', entityos._util.view.handlers['entityos-export-table']);

entityos._util.view.handlers['entityos-notify'] = function(event)
{
	var message = $(this).data('message');
	var type = $(this).data('type');
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		entityos._util.controller('app-notify',
		{
			message: message,
			type: type
		});
	}
}

$(document).off('click', '.entityos-notify, .myds-notify')
.on('click', '.entityos-notify, .myds-notify', entityos._util.view.handlers['entityos-notify']);

entityos._util.view.handlers['entityos-pdf'] = function(event)
{
	var scope = $(this).data('scope');
	var selector = $(this).data('selector');
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		if (selector == undefined) {selector = '#' + scope}
		entityos._util.controller.invoke('util-pdf-create',
		{
			selector: selector,
			saveLocal: true,
			options: {margin: [7,7], image: {type: 'jpeg', quality: 0.98}, jsPDF: {unit: 'mm', format: 'a4', orientation: 'p'}}
		});
	}
}

$(document).off('click', '.entityos-pdf, .myds-pdf')
.on('click', '.entityos-pdf, .myds-pdf', entityos._util.view.handlers['entityos-pdf']);

entityos._util.view.handlers['entityos-dropdown'] = function (event)
{
	var id = $(this).attr('id');
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var context = $(this).data('context');
	var html = $(this).html();
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		var button = $(this).parents(".btn-group").find('.btn');

		if (button.length == 0)
		{
			button = $(this).parents('.dropdown').find('.dropdown-toggle');
		}

		if (button.length == 0)
		{
			button = $(this).parents('.dropdown-menu').siblings('.dropdown-toggle');
		}

		if (button.length != 0)
		{
			var buttonText = button.find('span.dropdown-text');

			if (buttonText.length != 0)
			{
				buttonText.html(html)
			}
			else
			{
				button.html(html + ' <span class="caret"></span>');
			}

			if (scope == undefined)
			{
				scope = $(this).closest('ul.dropdown-menu').data('scope');
			}

			if (controller == undefined)
			{
				controller = $(this).closest('ul.dropdown-menu').data('controller');
			}

			if (context == undefined)
			{
				context = $(this).closest('ul.dropdown-menu').data('context');
			}

			if (controller == undefined) {controller = scope}

			if (controller == undefined)
			{
				controller = id
			}

			var otherData;

			if ($(this).closest('ul.dropdown-menu').length != 0)
			{
				otherData = entityos._util.data.clean($(this).closest('ul.dropdown-menu').data())
			}

			var param = {}
			param.dataContext = _.assign(otherData, entityos._util.data.clean($(this).data()));
			param._dataContext = _.assign(otherData, entityos._util.data.clean($(this).data()));
			
			if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}
			entityos._scope.data[controller].dataContext = _.assign(otherData, entityos._util.data.clean($(this).data()));

			if (scope != undefined)
			{
				if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}}
			}

			if (context != undefined && $(this).data('id') != undefined)
			{
				entityos._scope.data[controller][context] = $(this).data('id');
				entityos._scope.data[controller]['_' + context] = [$(this).data('id')];

				if (scope != undefined)
				{
					entityos._scope.data[scope][context] = $(this).data('id');
					entityos._scope.data[scope]['_' + context] = [$(this).data('id')];
				}
			}	

			entityos._util.controller.invoke({name: controller}, param);
		}	
	}
}

$(document).off('click', '.entityos-dropdown, .myds-dropdown')
.on('click', '.entityos-dropdown, .myds-dropdown', entityos._util.view.handlers['entityos-dropdown']);

entityos._util.view.handlers['entityos-range'] = function (event)
{
	var id = $(this).attr('id');
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var context = $(this).data('context');
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		if (scope == undefined) {scope = controller}

		if (scope == undefined)
		{
			scope = id
		}

		var param = {}
		param.dataContext = entityos._util.data.clean($(this).data());
		
		if (context != undefined)
		{
			if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}}

			entityos._scope.data[scope][context] = $(this).val();
			entityos._scope.data[scope]['_' + context] = $(this).data();
		}	

		if (controller != '')
		{
			entityos._util.controller.invoke(controller, param);
		}
	}
}

$(document).off('change', '.entityos-range, .myds-range')
.on('change', '.entityos-range, .myds-range', entityos._util.view.handlers['entityos-range']);

entityos._util.view.handlers['entityos-list'] = function (event)
{
	var element = $(this);
	var id = element.attr('id');
	var controller = element.data('controller');
	var scope = element.data('controller');
	var context = element.data('context');
	var disabled = element.hasClass('disabled');

	if (!disabled)
		{	
		element.closest('li').siblings().removeClass('active');
		element.closest('li').addClass('active');

		if (controller == undefined) {controller = scope}

		if (controller != undefined)
		{
			var param = {}
			param.dataContext = element.data();
			
			if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}
			entityos._scope.data[controller].dataContext = element.data();

			if (context != undefined)
			{
				entityos._scope.data[controller][context] = element.data('id');
				entityos._scope.data[controller]['_' + context] = [element.data('id')];
			}	

			entityos._util.controller.code[controller](param);
		}
		else
		{
			if (id != '')
			{	
				if (entityos._util.controller.code[id] != undefined)
				{	
					var param = {}
					param.dataContext = element.data();
					if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}
					entityos._util.controller.code[id](param);
				}
			}
		}	
	}
}

$(document).off('click', '.entityos-list, .myds-list')
.on('click', '.entityos-list, .myds-list', entityos._util.view.handlers['entityos-list']);

entityos._util.view.handlers['entityos-button-group'] = function (event)
{
	var element = $(this);
	element.addClass("active").siblings('.entityos-button-group, .myds-button-group').removeClass("active");
}

$(document).off('click', '.entityos-button-group, .myds-button-group')
.on('click', '.entityos-button-group, .myds-button-group', entityos._util.view.handlers['entityos-button-group']);


entityos._util.view.handlers['entityos-toggle-active'] = function (event)
{
	var element = $(this);
	element.toggleClass("active");
}

$(document).off('click', '.entityos-toggle-active, .myds-toggle-active')
.on('click', '.entityos-toggle-active, .myds-toggle-active', entityos._util.view.handlers['entityos-toggle-active']);


entityos._util.view.handlers['entityos-check'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var controllerBefore = $(this).data('controller-before');
	var context = $(this).data('context');
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		if (scope == undefined) {scope = controller}

		if ((controller != undefined || scope != undefined) && context != undefined)
		{	
			if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}}

			var selected = $(this).prop('checked');

			var dataID = $(this).data('id');
			var dataSelectedID = $(this).attr('data-selected-id');
			
			if (dataSelectedID != undefined)
			{
				 dataID = dataSelectedID;
			}

			var dataUnselectedID = $(this).attr('data-unselected-id');

			if (dataUnselectedID == undefined)
			{
				dataUnselectedID = $(this).attr('data-unchecked-id');
			}
			
			if (!selected && dataUnselectedID != undefined)
			{
				dataID = dataUnselectedID;
			}
				
			var param =
			{
				selected: selected,
				dataID: dataID,
				dataContext: $(this).data(),
				controller: controller,
				scope: scope
			}

			if (controllerBefore != undefined)
			{
				entityos._util.controller.code[controllerBefore](param);
			}

			var ids = [];
			var uncheckedids = [];

			if (selected)
			{
				ids.push(dataID)
			}
			else
			{
				uncheckedids.push(dataID)
			}
			
			if (controller != undefined)
			{
				var inputs = $('input.entityos-check[data-controller="' + controller + '"][data-context="' + context + '"]:visible,' +
                                ' input.myds-check[data-controller="' + controller + '"][data-context="' + context + '"]:visible');
				
				if (inputs.length != 1)
				{
		 			var checked = $('input.entityos-check[data-controller="' + controller + '"][data-context="' + context + '"]:checked:visible, ' +
                                        'input.myds-check[data-controller="' + controller + '"][data-context="' + context + '"]:checked:visible');

		 			ids = $.map(checked, function (c)
		 			{
		 				if ($(c).attr('data-id') != undefined)
		 				{
		 					return $(c).attr('data-id');
		 				}
		 				else if ($(c).attr('data-selected-id') != undefined)
		 				{
		 					return $(c).attr('data-selected-id');
		 				}
		 				else
		 				{
		 					return $(c).val();
		 				}
					});

		 			var unchecked = $('input.entityos-check[data-controller="' + controller + '"][data-context="' + context + '"]:not(:checked):visible, ' +
                                        'input.myds-check[data-controller="' + controller + '"][data-context="' + context + '"]:not(:checked):visible');
		 			uncheckedids = $.map(unchecked, function (c)
		 			{
		 				return $(c).data('id')}
		 			);
				}
			}
			else
			{
				var inputs = $('input.entityos-check[data-scope="' + scope + '"][data-context="' + context + '"]:visible, ' +
                                'input.myds-check[data-scope="' + scope + '"][data-context="' + context + '"]:visible');
				
				if (inputs.length != 1)
				{
		 			var checked = $('input.entityos-check[data-scope="' + scope + '"][data-context="' + context + '"]:checked:visible, ' +
                                        'input.myds-check[data-scope="' + scope + '"][data-context="' + context + '"]:checked:visible');

		 			ids = $.map(checked, function (c)
		 			{
		 				if ($(c).attr('data-id') != undefined)
		 				{
		 					return $(c).attr('data-id');
		 				}
		 				else if ($(c).attr('data-selected-id') != undefined)
		 				{
		 					return $(c).attr('data-selected-id');
		 				}
		 				else
		 				{
		 					return $(c).val();
		 				}
		 			});

		 			var unchecked = $('input.entityos-check[data-scope="' + scope + '"][data-context="' + context + '"]:not(:checked):visible, ' +
                                        'input.myds-check[data-scope="' + scope + '"][data-context="' + context + '"]:not(:checked):visible');
		 			uncheckedids = $.map(unchecked, function (c)
		 			{
		 				return $(c).data('id')}
		 			);
				}
			}
			
			entityos._scope.data[scope]['dataID'] = dataID;
	 		entityos._scope.data[scope][context] = (ids.length==0?'':ids.join(','));
	 		entityos._scope.data[scope]['_' + context] = ids;

	 		entityos._scope.data[scope][context + '-unselected'] = (uncheckedids.length==0?'':uncheckedids.join(','));
	 		entityos._scope.data[scope]['_' + context + '-unselected'] = uncheckedids;

			if (controller != undefined)
			{	
				entityos._util.controller.invoke(controller, param);
			}
		}		
	}
}

$(document).off('click', '.entityos-check, .myds-check')
.on('click', '.entityos-check, .myds-check', entityos._util.view.handlers['entityos-check']);

entityos._util.view.handlers['entityos-text'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var context = $(this).data('context');
	var enter = $(this).data('enter');
	var clean = $(this).data('clean');
	var disabled = $(this).hasClass('disabled');

	if (enter == undefined)
    { 
        enter = entityos._scope.app.options.textEnterDefault
    }

	var returnValue;

	if (!disabled)
	{
		if (event.which == '13' && enter == 'stop')
		{
			event.preventDefault();
			returnValue = false;
		}

		var val = $(this).val();
		var data = $(this).data();

		if (clean != 'disabled')
		{
			val = entityos._util.clean(val);
			data = entityos._util.data.clean(data);
		}

		if (scope != undefined && context != undefined)
		{
			if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}}
	 		entityos._scope.data[scope][context] = val;
	 		entityos._scope.data[scope]['_' + context] = data;
		}
		
		if (controller != undefined && context != undefined)
		{	
	 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

	 		entityos._scope.data[controller][context] = val;
	 		entityos._scope.data[controller]['_' + context] = data;
	 		entityos._scope.data[controller]['_' + context]._type = 'keyup';
	 		entityos._scope.data[controller]['_' + context]._source = event.target.id;
	 		entityos._scope.data[controller]['_' + context]._value = val;

			if (entityos._util.controller.code[controller] != undefined)
			{	
				if (entityos._scope.data[controller].timerText != 0) {clearTimeout(entityos._scope.data[controller].timerText)};
				
				var param = JSON.stringify(
				{
					dataContext: entityos._scope.data[controller][context],
					_type: 'keyup',
					_dataContext: entityos._scope.data[controller]['_' + context],
				});

				entityos._scope.data[controller].timerText = setTimeout('entityos._util.controller.code["' + controller + '"](' + param + ')', 500);
			}
		}
	}

	return returnValue
}

$(document).off('keyup', '.entityos-text, .myds-text')
.on('keyup', '.entityos-text, .myds-text', entityos._util.view.handlers['entityos-text']);

entityos._util.view.handlers['entityos-text-enter'] = function (event)
{
	var enter = $(this).data('enter');
	var disabled = $(this).hasClass('disabled');

    if (enter == undefined)
    { 
        enter = entityos._scope.app.options.textEnterDefault
    }
		
	if (!disabled)
	{
		if (event.which == '13' && enter == 'stop')
		{
			event.preventDefault();
			return false
		}
	}
}

$(document).off('keypress', '.entityos-text, .myds-text')
.on('keypress', '.entityos-text, .myds-text', entityos._util.view.handlers['entityos-text-enter']);

entityos._util.view.handlers['entityos-date-time'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var context = $(this).data('context');
	var enter = $(this).data('enter');
	var returnValue;

	if (controller == undefined) {controller = scope}

	if (controller == undefined)
	{
		controller = $(this).children('input').data('controller');
	}

	if (context == undefined)
	{
		context = $(this).children('input').data('context');
	}

	if (event.which == '13' && enter == 'stop')
	{
		event.preventDefault();
		returnValue = false;
   }
	
	if (controller != undefined && context != undefined)
	{	
 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

 		entityos._scope.data[controller][context] = event.format();
 		entityos._scope.data[controller]['_' + context] = event;

		if (entityos._util.controller.code[controller] != undefined)
		{	
			if (entityos._scope.data[controller].timerText != 0) {clearTimeout(entityos._scope.data[controller].timerText)};
			
			var param = {dataContext: $(this).children('input').data()};

			if (context != undefined)
			{
				param.dataContext[context] = event.format();
				param.dataContext._value = event.format();
				param._type = 'dateChange'
			}

			param.dataContext = _.assign(param.dataContext, $(this).children('input').data())

			entityos._scope.data[controller].timerText = setTimeout('entityos._util.controller.code["' + controller + '"](' + JSON.stringify(param) + ')', 500);
		}
	}
	
	return returnValue
}

$(document).off('changeDate clearDate', '.entityos-date, .entityos-date-time, .myds-date, .myds-date-time')
.on('changeDate clearDate', '.entityos-date, .entityos-date-time, .myds-date, .myds-date-time', entityos._util.view.handlers['entityos-date-time']);

entityos._util.view.handlers['entityos-focus'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var context = $(this).data('context');
	var clean = $(this).data('clean');

	var val = $(this).val();
	var data = $(this).data();

	if (clean != 'disabled')
	{
		val = entityos._util.clean(val);
		data = entityos._util.data.clean(data);
	}
	
	if (scope != undefined && context != undefined)
	{
		if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}}
 		entityos._scope.data[scope][context] = val;
 		entityos._scope.data[scope]['_' + context] = data;
	}

	if (controller != undefined && context != undefined)
	{	
 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

		entityos._scope.data[controller][context] = val;
 		entityos._scope.data[controller]['_' + context] = data;
 		entityos._scope.data[controller]['_' + context]._type = 'focusout';
 		entityos._scope.data[controller]['_' + context][context] = val;
 		entityos._scope.data[controller]['_' + context]._value = val;
 	
		if (entityos._util.controller.code[controller] != undefined)
		{	
			entityos._util.controller.code[controller](
			{
				dataContext: entityos._scope.data[controller]['_' + context],
				_type: 'focusout',
				_class: 'entityos-text',
				_xhtmlElementID: $(this).attr('id')
			});
		}
	}		
}

$(document).off('focusout', '.entityos-focus, .myds-focus')
.on('focusout', '.entityos-focus, .myds-focus', entityos._util.view.handlers['entityos-focus']);

entityos._util.view.handlers['entityos-text-select-focus-out'] = function (event)
{
	if ($(this).val() == '')
	{
		var scope = $(this).data('scope');
		if (_.isUndefined(scope)) {scope = $(this).data('controller')}
		var context = $(this).data('context');
		
		if (scope != undefined && context != undefined)
		{
			if (!_.isUndefined(entityos._scope.data[scope])) {entityos._scope.data[scope][context] = ''}
			$(this).attr('data-id', '');
		}
	}
}

$(document).off('focusout', '.entityos-text-select, .entityos-focus-out, .myds-text-select, .myds-focus-out')
.on('focusout', '.entityos-text-select, .entityos-focus-out, .myds-text-select, .myds-focus-out', entityos._util.view.handlers['entityos-text-select-focus-out']);

entityos._util.view.handlers['entityos-text-select-change'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var context = $(this).data('context');
	var disabled = $(this).hasClass('disabled');

	if (!disabled)
	{
		if (event.type == 'select2:clear')
		{
			$(this).on("select2:opening.cancelOpen", function (evt) {
		    evt.preventDefault();
		    $(this).off("select2:opening.cancelOpen");
		  });
		}

		if (scope == undefined)
		{
			scope = controller;
		}

		var clean = $(this).data('clean');
		var val = $(this).val();
		var data = $(this).data();

		var contextText = $(this).attr('context-text');

		if (contextText == undefined && context != undefined)
		{
			contextText = context + 'text';
		}

		if ($(this).data('select2') != undefined)
		{
			var _data = $(this).select2('data');
			if (_data.length != 0)
			{
				data = _data[0]
			}
		}

		if (clean != 'disabled')
		{
			val = entityos._util.clean(val);
			data = entityos._util.data.clean(data);
		}
		
		if (scope != undefined && context != undefined)
		{
			if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}}
			
			if (val == '')
			{
				entityos._scope.data[scope]['_' + context] = undefined;
				entityos._scope.data[scope][context] = '';

				if (contextText != undefined)
				{
					entityos._scope.data[scope][contextText] = '';
				}

				if ($(this).attr('data-none') != undefined)
				{
					entityos._scope.data[scope][context] = $(this).attr('data-none');
				}
			}
			else
			{
				if (typeof $.fn.typeahead == 'function')
				{
					entityos._scope.data[scope]['_' + context] = $(this).typeahead("getActive")

					if (entityos._scope.data[scope]['_' + context] != undefined)
					{
						entityos._scope.data[scope][context] = entityos._scope.data[scope]['_' + context].id
						$(this).attr('data-id', entityos._scope.data[scope][context].id);
					}
				}
				else
				{
		 			entityos._scope.data[scope][context] = val;
		 			if (contextText != undefined && data != undefined)
					{
						entityos._scope.data[scope][contextText] = data.text;
					}

		 			$(this).attr('data-id', val);
		 			entityos._scope.data[scope]['_' + context] = data;
		 			entityos._scope.data[scope]['_' + context]._type = 'change';
		 			entityos._scope.data[scope]['_' + context][context] = val;
		 			entityos._scope.data[scope]['_' + context]._value = val;
		 		}	
		 	}
		}

		if (controller != undefined && context != undefined)
		{	
	 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

			if (typeof $.fn.typeahead == 'function')
			{
				var set = $(this).attr('data-context-set');

				entityos._scope.data[controller]['_' + context] = $(this).typeahead("getActive");

				if (set == 'id')
				{
					entityos._scope.data[controller][context] = entityos._scope.data[controller]['_' + context].id;
				}
				else
				{
					entityos._scope.data[controller][context] = $(this).typeahead("getActive");
					entityos._scope.data[controller][context + '-id'] = entityos._scope.data[controller][context].id;
				}
					
				$(this).attr('data-id', entityos._scope.data[controller][context].id);
			}
			else
			{
	 			entityos._scope.data[controller][context] = val;
	 			
	 			if (contextText != undefined && data != undefined)
				{
					entityos._scope.data[scope][contextText] = data.text;
				}

	 			entityos._scope.data[controller]['_' + context] = data;
	 			delete entityos._scope.data[controller]['_' + context].chosen;  //?
	 			entityos._scope.data[controller]['_' + context]._type = 'change';
	 			entityos._scope.data[controller]['_' + context][context] = val;
	 			entityos._scope.data[controller]['_' + context]._value = val;
	 		}	

			if (entityos._util.controller.code[controller] != undefined)
			{				
				var param =
				{
					dataContext: entityos._scope.data[controller]['_' + context],
					_type: 'change',
					_class: 'entityos-text-select',
					_xhtmlElementID: $(this).attr('id')
				}

				entityos._util.controller.code[controller](param);
			}
		}		
	}
}

$(document).off('change select2:clear', '.entityos-text-select, .myds-text-select')
.on('change select2:clear', '.entityos-text-select, .myds-text-select', entityos._util.view.handlers['entityos-text-select-change']);

entityos._util.view.handlers['entityos-select'] = function (event)
{
	var controller = $(this).data('controller');
	var scope = $(this).data('scope');
	var context = $(this).data('context');
	var contextText = $(this).attr('context-text');

	if (contextText == undefined && context != undefined)
	{
		contextText = context + 'text';
	}

	var clean = $(this).data('clean');

	var val = $(this).val();
	var data = $(this).data();

	if (clean != 'disabled')
	{
		val = entityos._util.clean(val);
		data = entityos._util.data.clean(data);
	}
	
	if (scope != undefined && context != undefined)
	{
		if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}}
 		entityos._scope.data[scope][context] = val;
 		entityos._scope.data[scope]['_' + context] = data;

 		if (contextText != undefined)
 		{
 			entityos._scope.data[scope][contextText] = $(this).find('option:selected').text();
 		}
	}

	if (controller != undefined && context != undefined)
	{	
 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

		entityos._scope.data[controller][context] = val;
 		entityos._scope.data[controller]['_' + context] = data;

 		if (contextText != undefined)
 		{
 			entityos._scope.data[controller][contextText] = $(this).find('option:selected').text();
 		}
 	
		if (entityos._util.controller.code[controller] != undefined)
		{	
			entityos._util.controller.code[controller]({dataContext: entityos._scope.data[controller]['_' + context]});
		}
	}		
}

$(document).off('change', '.entityos-select, .myds-select')
.on('change', '.entityos-select, .myds-select', entityos._util.view.handlers['entityos-select']);

entityos._util.view.handlers['entityos-change'] = function (event)
{
	var controller = $(this).data('controller');
	var context = $(this).data('context');
	var clean = $(this).data('clean');
	var disabled = $(this).hasClass('disabled');

	var val = $(this).val();
	var data = $(this).data();

	if (!disabled)
	{
		if (clean != 'disabled')
		{
			val = entityos._util.clean(val);
			data = entityos._util.data.clean(data);
		}

		if (controller != undefined && context != undefined)
		{	
	 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

	 		entityos._scope.data[controller][context] = val;
	 		entityos._scope.data[controller]['_' + context] = data;

			if (entityos._util.controller.code[controller] != undefined)
			{	
				var param = {dataContext: entityos._scope.data[controller][context]}
				entityos._util.controller.code[controller](param);
			}
		}
	}
}

$(document).off('change', '.entityos-change, .myds-change')
.on('change', '.entityos-change, .myds-change', entityos._util.view.handlers['entityos-change']);

entityos._util.view.handlers['entityos-sort'] = function (event)
{
	var sort = $(this).attr('data-sort');
	var sortDirection = $(this).attr('data-sort-direction');
	var controller = $(this).attr('data-controller');
	var scope = $(this).attr('data-scope');
	var context = $(this).attr('data-context');
	var clean = $(this).data('clean');

	var val = $(this).val();
	var data = $(this).data();

	if (scope == undefined) {scope = controller}

	if (clean != 'disabled')
	{
		val = entityos._util.clean(val);
		data = entityos._util.data.clean(data);
	}

	if (_.isUndefined(controller))
	{
		controller = $(this).parent().attr('data-controller');
	}

	if (_.isUndefined(context))
	{
		context = $(this).parent().attr('data-context');
	}

	if (_.isUndefined(context))
	{
		context = 'sort';
	}

	if (_.isUndefined(sortDirection))
	{
		sortDirection = 'desc';
	}

	sortDirection = (sortDirection=='desc'?'asc':'desc')

	if (controller != undefined && context != undefined)
	{	
 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

 		entityos._scope.data[controller][context] = {name: sort, direction: sortDirection};
 		entityos._scope.data[controller]['_' + context] = data;

		if (entityos._util.controller.code[controller] != undefined)
		{	
			var param = {sort: entityos._scope.data[controller][context]}
			param.context = context;
			entityos._util.controller.code[controller](param);
		}
	}		
}

$(document).off('click', '.entityos-sort, .myds-sort')
.on('click', '.entityos-sort, .myds-sort', entityos._util.view.handlers['entityos-sort']);

entityos._util.view.handlers['entityos-page-rows'] = function (event)
{
	var rowsperpage = $(this).attr('data-rowsperpage');
	var controller = $(this).attr('data-controller');
	var scope = $(this).attr('data-scope');
	var context = $(this).attr('data-context');
	var clean = $(this).data('clean');

	var data = $(this).data();

	if (scope == undefined) {scope = controller}

	if (clean != 'disabled')
	{
		data = entityos._util.data.clean(data);
	}

	if (_.isUndefined(controller))
	{
		controller = $(this).parent().attr('data-controller');
	}

	if (_.isUndefined(context))
	{
		context = $(this).parent().attr('data-context');
	}

	if (_.isUndefined(context))
	{
		context = 'rowsperpage';
	}

	if (controller != undefined && context != undefined)
	{	
 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

 		entityos._scope.data[controller][context] = {count: rowsperpage};
 		entityos._scope.data[controller]['_' + context] = data;

		if (entityos._util.controller.code[controller] != undefined)
		{	
			var param = {rowsPerPage: entityos._scope.data[controller][context]}
			param.context = context;
			entityos._util.controller.code[controller](param);
		}
	}		
}

$(document).off('click', '.entityos-page-rows, .myds-page-row')
.on('click', '.entityos-page-rows, .myds-page-row', entityos._util.view.handlers['entityos-page-rows']);

entityos._util.view.handlers['entityos-validate'] = function (event)
{
	entityos._util.validate.check(
	{
		element: $(this)
	});
}

$(document).off('focusout keyup change.select2 select2:clear', '.entityos-validate, .myds-validate')
.on('focusout keyup change.select2 select2:clear', '.entityos-validate, .myds-validate', entityos._util.view.handlers['entityos-validate']);

entityos._util.view.handlers['entityos-date-time-picker'] = function(event)
{
	var element;

	if ($(event.target).prop("tagName") == 'INPUT')
	{
		element = $(event.target);
	}
	else
	{
		element = $(event.target).children('input');
	}

	var processEvent = true;

	if (event.type == 'change' && element.attr('data-onchange') != 'true')
	{
		processEvent = false;
	}

	if (processEvent)
	{
		var controller = element.data('controller');
		var scope = element.data('scope');
		if (controller == undefined) {controller = scope}

		var context = element.data('context');

		var val = entityos._util.clean(element.val());
		var data = entityos._util.data.clean(element.data());

		if (controller != undefined && context != undefined)
		{	
	 		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

	 		entityos._scope.data[controller][context] = val;
	 		entityos._scope.data[controller]['_' + context] = data;

	 		entityos._scope.data[controller] = _.assign(entityos._scope.data[controller],  element.data());

			if (entityos._util.controller.code[controller] != undefined)
			{	
				var param = {dataContext: entityos._scope.data[controller][context]}
				param._dataContext = element.data();

				entityos._util.controller.invoke(controller, param);
			}
		}

		if ($(element).hasClass('entityos-validate'))
		{
			entityos._util.validate.check(element);
		}
	}
}

$(document).off('dp.change change.datetimepicker error.datetimepicker', '.myds, .entityos-date, .entityos-date-time, .myds-date, .myds-date-time')
.on('dp.change  change.datetimepicker error.datetimepicker', '.myds, .entityos-date, .entityos-date-time, .myds-date, .myds-date-time', entityos._util.view.handlers['entityos-date-time-picker']);

$(document).off('focusout', '.entityos-date input, .entityos-date-time input, .myds-date input, .myds-date-time input')
.on('focusout', '.entityos-date input, .entityos-date-time input, .myds-date input, .myds-date-time input', entityos._util.view.handlers['entityos-date-time-picker']);

entityos._util.view.handlers['entityos-file-input'] = function(event)
{
	var element = $(event.target);
	var elementInput = element.find('input[type="file"]');

	if (elementInput.attr('type') == 'file')
	{
		var controller = element.data('controller');
		var context = element.data('context');

		if (context == undefined) {context = 'file'}

		if (controller != undefined)
		{	
			if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

			if (elementInput.length > 0)
			{
				entityos._scope.data[controller][context] = {id: elementInput.attr('id')};
				entityos._scope.data[controller]['_' + context] = elementInput;
			}

			if (entityos._util.controller.code[controller] != undefined)
			{	
				var param = {dataContext: entityos._scope.data[controller][context]}
				entityos._util.controller.invoke(controller, param);
				//19J:entityos._util.controller.code[controller](param);
			}
		}
	}
}

$(document).off('change.bs.fileinput', '.entityos, .entityos-file, .myds, .myds-file')
.on('change.bs.fileinput', '.entityos, .entityos-file, .myds, .myds-file', entityos._util.view.handlers['entityos-file-input']);

if (typeof $.fn.metisMenu == 'function')
{ 
	entityos._util.view.handlers['entityos-menu-set'] = function (e)
	{
		entityos._util.menu.set(
		{
			element: $(this)
		});
	}

	$(document).off('click', '.entityos-menu a, .myds-menu a')
	.on('click', '.entityos-menu a, .myds-menu a', entityos._util.view.handlers['entityos-menu-set']);
}

entityos._util.view.handlers['entityos-file-input-custom'] = function()
{
   let fileName = $(this).val().split('\\').pop();
   $(this).next('.custom-file-label').addClass("selected").html(fileName);
}

$(document).off('change', '.custom-file-input')
.on('change', '.custom-file-input', entityos._util.view.handlers['entityos-file-input-custom']);

if (typeof $.fn.tab == 'function')
{ 
	entityos._util.view.handlers['entityos-tab-a'] = function (e)
	{
        if ($(this).attr('href') != undefined)
        {
            e.preventDefault()
            $(this).tab('show');
            $('.nav-tabs a :visible').parent().parent().removeClass('active');
            $('.nav-tabs a[href="' + $(this).attr("href") + '"] :visible').parent().parent().addClass('active');
        }
	}

	$(document).off('click', '.entityos-tab > a, .myds-tab > a')
	.on('click', '.entityos-tab > a, .myds-tab > a', entityos._util.view.handlers['entityos-tab-a']);

	entityos._util.view.handlers['entityos-tab'] = function (e)
	{
        if ($(this).attr('href') != undefined) {
            e.preventDefault();
            $('a[href="' + $(this).attr('href') + '"]').tab('show');
        }
	}

	$(document).off('click', '.entityos-tab, .myds-tab')
	.on('click', '.entityos-tab, .myds-tab', entityos._util.view.handlers['entityos-tab']);

	entityos._util.view.handlers['entityos-pill-a'] = function (e)
	{
        if ($(this).attr('href') != undefined)
        {
            e.preventDefault();
            $(this).tab('show');
        }
	}

	$(document).off('click', '.entityos-pill a, .myds-pill a')
	.on('click', '.entityos-pill a, .myds-pill a', entityos._util.view.handlers['entityos-pill-a']);	

	entityos._util.view.handlers['entityos-tab-a-show'] = function(event)
	{
		var uriContext = $(event.target).attr('href').replace('#', '');
		var controller = $(event.target).attr('data-controller');
		var onshow = ($(event.target).attr('data-on-show') != 'false');

		var status = event.type;

		if (onshow != undefined && event.type == 'show' || event.type == 'shown')
		{
			if (controller == undefined)
			{
				controller = $(event.target).parent().parent().attr('data-controller');
			}

			if (_.has(entityos._scope.app.view, 'data'))
			{
				entityos._util.view.track(
				{
					view: entityos._scope.app.view.data,
					uri: entityos._scope.app.uri,
					uriContext: uriContext
				});
			}

			if (controller != undefined)
			{
				var param =
				{
					uriContext: uriContext,
					status: status,
					dataContext: $(event.target).data()
				}

				entityos._scope.data[controller] = param;

				entityos._util.controller.invoke(controller, param);
				//19J:entityos._util.controller.code[controller](param);
			}
			else
			{
				if (entityos._util.controller.code[uriContext] != undefined)
				{
					if (entityos._scope.data[uriContext] == undefined) {entityos._scope.data[uriContext] = {}};

					entityos._util.controller.invoke(uriContext, param);
				}
				else
				{
					var uriContext = uriContext.split('_');

					if (entityos._util.controller.code[uriContext[0]] != undefined)
					{
						if (entityos._scope.data[uriContext[0]] == undefined) {entityos._scope.data[uriContext[0]] = {}};
						entityos._util.controller.invoke(uriContext[0], {context: uriContext[1]});
					}
				}
			}
		}
	}

	$(document).off('shown.bs.tab show.bs.tab', '.app-tab a, .app-pill a, .entityos-tab a, .myds-tab a')
					.on('shown.bs.tab show.bs.tab', '.app-tab a, .app-pill a, .entityos-tab a, .myds-tab a',
						entityos._util.view.handlers['entityos-tab-a-show']);
}

if (typeof $.fn.modal == 'function')
{ 
	entityos._util.view.handlers['entityos-modal-shown'] = function (event)
	{
		var id = event.target.id;

		if (id != '')
		{			
			var controller = $(event.target).attr('data-controller');
			if (controller == undefined) {controller = id}

			var param = {viewStatus: 'shown'}

			if (entityos._scope.app.uriContext != undefined)
			{ 
				param.context = (entityos._scope.app.uriContext).replace('#', '')
			}

			if (event.relatedTarget != undefined)
			{
				param.dataContext = $(event.relatedTarget).data();
				$(event.target.id).data('context', param.dataContext);
			}
			else if (entityos._scope.app.dataContext != undefined)
			{
				param = $.extend(true, param, {dataContext: entityos._scope.app.dataContext})
			}

			if (entityos._scope.data[id] == undefined) {entityos._scope.data[id] = {}};
			entityos._scope.data[id] = _.extend(entityos._scope.data[id], param);

			if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}};
			entityos._scope.data[controller] = _.extend(entityos._scope.data[controller], param);

			if (_.has(entityos._scope.app.view, 'data'))
			{
				entityos._util.view.track(
				{
					view: entityos._scope.app.view.data,
					uri: entityos._scope.app.options.startURI,
					uriContext: id,
					dataContext: param.dataContext
				});
			}

			if (controller != undefined)
			{	
				if (entityos._util.controller.exists(controller))
				{
					entityos._util.controller.invoke(controller, param);
				}
			}
		}	
    }

    $(document).off('shown.bs.modal')
	.on('shown.bs.modal', entityos._util.view.handlers['entityos-modal-shown']);

	entityos._util.view.handlers['entityos-modal-show'] = function (event)
	{
		var id = event.target.id;

		entityos._util.reset({controller: id});

		var controller;

		if ($(event.target).attr('data-controller-show') != undefined)
		{
			controller = $(event.target).attr('data-controller-show')
		}

		var param = {viewStatus: 'show'}

		if (entityos._scope.app.uriContext != undefined)
		{ 
			param.context = (entityos._scope.app.uriContext).replace('#', '')
		}

		if (id != '')
		{
			if (event.relatedTarget != undefined)
			{
				param.dataContext = $(event.relatedTarget).data();
				$(event.target.id).data('context', param.dataContext);
			}
			if (event.target != undefined)
			{
				param.dataContext = $(event.target).data();
				$(event.target.id).data('context', param.dataContext);
			}
			else if (entityos._scope.app.dataContext != undefined)
			{
				param = $.extend(true, param, {dataContext: entityos._scope.app.dataContext})
			}

			if (entityos._scope.data[id] == undefined) {entityos._scope.data[id] = {}};
			entityos._scope.data[id] = _.extend(entityos._scope.data[id], param);
		}	

		if (controller != undefined)
		{	
			if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}};
			entityos._scope.data[controller] = _.extend(entityos._scope.data[controller], param);

			if (entityos._util.controller.exists(controller))
			{
				entityos._util.controller.invoke(controller, param);
			}
		}

		if (typeof $.fn.popover == 'function')
		{ 
			$('.popover').popover('hide');
		}	
	}

	$(document).off('show.bs.modal')
    .on('show.bs.modal' , entityos._util.view.handlers['entityos-modal-show']);
}

if (typeof $.fn.collapse == 'function')
{
	entityos._util.view.handlers['entityos-collapse-hide'] = function (event)
	{
        var onhide = ($(event.target).attr('data-on-hide') != 'false');

        if (onhide)
        {
            var id = event.target.id;

            var controller = $(event.target).attr('data-controller');
            if (controller == undefined) {controller = $(event.target).attr('data-scope')};
            if (controller == undefined) {controller = id};

            if (id != '')
            {	
                var source = $('[data-target="#' + id + '"]');
                if (source != undefined)
                {	
                    if (source.html() != undefined && source.attr('data-auto') != 'false')
                    {	
                        if ((source.html()).indexOf('Hide') != -1)
                        {
                            source.html(source.html().replace('Hide', 'Show'));
                        }
                    }	
                }	

                if (controller != undefined)
                {
                    if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}};
                    entityos._scope.data[controller] = _.extend(entityos._scope.data[controller], {viewStatus: 'hidden'});

                    if (entityos._util.controller.exists(controller))
                    {
                        entityos._util.controller.invoke(controller,
                        {
                            status: 'hidden',
                            dataContext: $(event.target).data()
                        });
                    }
                }
            }

            var clearOnHideTarget = $(event.target).attr('data-clear-on-hide-target')
            if (clearOnHideTarget != undefined)
            {
                entityos._util.view.queue.show(clearOnHideTarget, '');

                if (_.has(entityos._scope, 'app.options.styles.collapse.showHideClass'))
                {
                    $(clearOnHideTarget).removeClass(entityos._scope.app.options.styles.collapse.showHideClass)
                }
            }

            $('#' + id + ' .entityos-clear-on-collapse-hide').html('');
            $('#' + id + ' .myds-clear-on-collapse-hide').html('');
        }
    }

    $(document).off('hidden.bs.collapse', '.entityos-collapse, .myds-collapse')
	.on('hidden.bs.collapse', '.entityos-collapse, .myds-collapse', entityos._util.view.handlers['entityos-collapse-hide']);

	entityos._util.view.handlers['entityos-collapse-shown'] = function (event)
	{
		var processEvent = true;
		var eventID;

		_.each(event, function (value, key)
		{
			if (_.includes(key, 'jQuery'))
			{
				eventID = _.replace(key, 'jQuery', '')
			}
		});

		if (eventID != undefined)
		{
			if (entityos._events == undefined)
			{
				entityos._events = {}
			}

			processEvent = (entityos._events[eventID] == undefined);
			entityos._events[eventID] = event;
		}

		var id = event.target.id;

		var controller = $(event.target).attr('data-controller')
		//if (controller == undefined) {controller = $(event.target).attr('data-scope')}
		var scope = $(event.target).attr('data-scope');
		if (scope == undefined) {scope = controller}

		if (controller != undefined && id == undefined) {id = controller}
		
		if (id != '')
		{	
			var source = $('[data-target="#' + id + '"]');
			if (source != undefined)
			{
				if (source.html() != undefined && source.attr('data-auto') != 'false')
				{
					if ((source.html()).indexOf('Show') != -1)
					{
						source.html(source.html().replace('Show', 'Hide'));
					}
				}	
			}
		}

	/*	var clearOnHideTarget = $(event.target).attr('data-clear-on-hide-target')
		if (clearOnHideTarget != undefined)
		{
			if (_.has(entityos._scope, 'app.options.styles.collapse.showHideClass'))
			{
				$(clearOnHideTarget).addClass(entityos._scope.app.options.styles.collapse.showHideClass)
			}
		}*/

		if (scope != undefined)
		{
			if (entityos._scope.data[scope] == undefined) {entityos._scope.data[scope] = {}};
			entityos._scope.data[scope].viewStatus = 'shown';
			entityos._scope.data[scope].dataContext = $(event.target).data();
		}

        var refresh = ($(event.target).attr('data-reset') == 'true')
        if (refresh)
        {
            entityos._util.view.refresh(
			{
				scope: scope,
				reset: true,
				resetNew: true,
				resetScope: true,
				resetScopeNew: true
			});
        }

		if (controller == undefined) {controller = id};

		if (controller != undefined)
		{					
			entityos._util.controller.invoke(controller,
			{
				status: 'shown',
				dataContext: $(event.target).data()
			});
		}
    }

	$(document).off('shown.bs.collapse', '.entityos-collapse:visible, .myds-collapse:visible')
	.on('shown.bs.collapse', '.entityos-collapse:visible, .myds-collapse:visible', entityos._util.view.handlers['entityos-collapse-shown']);

	entityos._util.view.handlers['entityos-collapse-show'] = function (event)
	{
		var id = event.target.id;

		var onshow = ($(event.target).attr('data-on-show') != 'false');

		if (onshow)
		{
			if ($(event.target).attr('data-controller') != undefined)
			{
				id = $(event.target).attr('data-controller')
			}
			
			if (id != '')
			{	
				var controller = id;

				if (controller != undefined)
				{
					if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}};
					entityos._scope.data[controller].viewStatus = 'show';
					entityos._scope.data[controller].dataContext = $(event.target).data();

					entityos._util.controller.invoke(controller,
					{
						status: 'show',
						dataContext: $(event.target).data()
					});
				}
			}	
		}
   }

   $(document).off('show.bs.collapse', '.entityos-collapse, .myds-collapse')
	.on('show.bs.collapse', '.entityos-collapse, .myds-collapse', entityos._util.view.handlers['entityos-collapse-show']);

	entityos._util.view.handlers['entityos-collapse-toggle'] = function (event)
	{
		var button = $(event.target);
		if (!$(event.target).is('i'))
		{
			button = button.find('i');
		}

		button.toggleClass('fa-chevron-up').toggleClass('fa-chevron-down');
	}

	 $(document).off('click', '.entityos-collapse-toggle:visible, .myds-collapse-toggle:visible')
	.on('click', '.entityos-collapse-toggle:visible, .myds-collapse-toggle:visible', entityos._util.view.handlers['entityos-collapse-toggle']);
}

if (typeof $.fn.popover == 'function')
{ 
   entityos._util.view.handlers['entityos-popover-shown'] = function (event)
	{
		if (event.target != undefined)
		{
			var id = event.target.id;
			if (id == '') {id = $(event.target).attr('data-controller')}

			if (id != '')
			{	
				var param = {}

				if (entityos._scope.app.uriContext != undefined)
				{ 
					param.context = (entityos._scope.app.uriContext).replace('#', '')
				}

				param.dataContext = 
				{
					id: $(event.target).attr('data-id'),
					reference: $(event.target).attr('data-reference'),
				}
			}	

			var controller = id;

			if (controller != undefined)
			{
				if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}};

				if (entityos._util.controller.exists(controller))
				{
					entityos._util.controller.invoke(controller,
					{
						status: 'show',
						dataContext: $(event.target).data()
					});
				}
			}
		}	
	}

	//entityos-popover
    $(document).off('shown.bs.popover').on('shown.bs.popover', entityos._util.view.handlers['entityos-popover-shown']);
    $(document).off('shown.bs.popover', '.entityos-popover, .myds-popover')
    .on('shown.bs.popover', '.entityos-popover, .myds-popover', entityos._util.view.handlers['entityos-popover-shown']);

	entityos._util.view.handlers['entityos-popover-show'] = function (event)
	{
		$('.popover:visible').popover("hide")	
	}

	$(document).off('show.bs.popover').on('show.bs.popover', entityos._util.view.handlers['entityos-popover-show']);
	$(document).off('show.bs.popover', '.entityos-popover, .myds-popover')
    .on('show.bs.popover', '.entityos-popover, .myds-popover', entityos._util.view.handlers['entityos-popover-show']);
}    

if (typeof $.fn.carousel == 'function')
{ 
   entityos._util.view.handlers['entityos-slide'] = function (event)
	{
		if (event.relatedTarget != undefined)
		{
			var onslide = $(event.relatedTarget).attr('data-on-slide');

			if (onslide)
			{ 
				var id = event.relatedTarget.id;
				if (id == '') {id = $(event.relatedTarget).attr('data-controller')}

				if (id != '')
				{	
					var param = {status: 'slide'}

					if (entityos._scope.app.uriContext != undefined)
					{ 
						param.context = (entityos._scope.app.uriContext).replace('#', '')
					}

					param.dataContext = 
					{
						id: $(event.relatedTarget).attr('data-id'),
						reference: $(event.relatedTarget).attr('data-reference'),
					}
				}	

				var controller = id;

				if (controller != undefined)
				{
					if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}};
					entityos._util.controller.invoke(controller, param);
				}
			}
		}
	}

	$(document).off('slide.bs.carousel', '.entityos-slide, .myds-slide')
   .on('slide.bs.carousel', '.entityos-slide, .myds-slide', entityos._util.view.handlers['entityos-slide']);
}

if (typeof $.fn.carousel == 'function')
{ 
    entityos._util.view.handlers['entityos-slid'] =	function (event)
	{
		if (event.relatedTarget != undefined)
		{
			var id = event.relatedTarget.id;
			if (id == '') {id = $(event.relatedTarget).attr('data-controller')}

			if (id != '')
			{	
				var param = {status: 'slid'}

				if (entityos._scope.app.uriContext != undefined)
				{ 
					param.context = (entityos._scope.app.uriContext).replace('#', '')
				}

				param.dataContext = 
				{
					id: $(event.relatedTarget).attr('data-id'),
					reference: $(event.relatedTarget).attr('data-reference'),
				}
			}	

			var controller = id;

			if (controller != undefined)
			{
				if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}};
				entityos._util.controller.invoke(controller, param);
			}
		}	
	}

	$(document).off('slid.bs.carousel', '.entityos-slid, .myds-slid')
	.on('slid.bs.carousel', '.entityos-slid, .myds-slid', entityos._util.view.handlers['entityos-slid']);
}

if (typeof $.fn.dropdown == 'function')
{ 
	entityos._util.view.handlers['entityos-dropdown'] = function (event)
	{
		if (event.relatedTarget != undefined)
		{
			var param = {status: 'show'}

			if (entityos._scope.app.uriContext != undefined)
			{ 
				param.context = (entityos._scope.app.uriContext).replace('#', '')
			}

			var controller = $(event.relatedTarget).data('controller');
			param.dataContext = entityos._util.data.clean($(event.relatedTarget).data());

			if (controller == undefined && $(event.relatedTarget).parent().length > 0)
			{
				controller = $(event.relatedTarget).parent().data('controller');
				param.dataContext = entityos._util.data.clean($(event.relatedTarget).parent().data());
			}
	
			if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}
			entityos._scope.data[controller].dataContext = param.dataContext;

			entityos._util.controller.invoke(controller, param)
		}	
	}

	$(document).off('show.bs.dropdown', '.entityos-dropdown, .myds-dropdown')
	.on('show.bs.dropdown', '.entityos-dropdown, .myds-dropdown', entityos._util.view.handlers['entityos-dropdown']);
}

if (typeof $.fn.toast == 'function')
{
	entityos._util.view.handlers['entityos-toast-show'] = function (event)
	{
		$('#entityos-toast').css('z-index', '9999');
		$('#myds-toast').css('z-index', '9999')
	}

	$(document).off('show.bs.toast', '#entityos-toast, #myds-toast')
	.on('show.bs.toast', '#entityos-toast, #myds-toast', entityos._util.view.handlers['entityos-toast-show']);

	entityos._util.view.handlers['entityos-toast-hidden'] = function (event)
	{
		$('#entityos-toast').css('z-index', '0');
		$('#myds-toast').css('z-index', '0')
	}

	$(document).off('hidden.bs.toast', '#entityos-toast, #myds-toast')
	.on('hidden.bs.toast', '#entityos-toast, #myds-toast', entityos._util.view.handlers['entityos-toast-hidden']);
}

entityos._util.view.handlers['entityos-more'] = function (event)
{
	$(this).addClass('disabled');

	var id = $(this).attr('data-id');
	var start = $(this).attr('data-start');
	var rows = $(this).attr('data-rows');
	var controller = $(this).attr('data-controller');
	var context = $(this).attr('data-context');

	if (controller != undefined)
	{
		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}
		entityos._scope.data[controller].dataContext = entityos._util.data.clean($(this).data());
	}

	entityos._util.view.moreSearch(
	{
		id: id,
		startrow: start,
		rows: rows,
		controller: controller,
		context: context
	});
}

$(document).off('click', '.entityos-more, .myds-more')
.on('click', '.entityos-more, .myds-more', entityos._util.view.handlers['entityos-more']);

entityos._util.view.handlers['entityos-page'] = function (event)
{
	$(this).addClass('disabled');

	var id = $(this).attr('data-id');
	var page = $(this).attr('data-page');
	var pages = $(this).attr('data-pages');
	var showPages = $(this).attr('data-show-pages');
	var showPagesMaximum = $(this).attr('data-show-pages-maximum');
	var controller = $(this).attr('data-controller');
	var context = $(this).attr('data-context');
	var start = $(this).attr('data-start');
	var rows = $(this).attr('data-rows');

	if (controller != undefined)
	{
		if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}
		entityos._scope.data[controller].dataContext = entityos._util.data.clean($(this).data());
	}
	
	entityos._util.view.showPage(
	{
		id: id,
		number: page,
		pages: pages,
		showPages: showPages,
		showPagesMaximum: showPagesMaximum,
		controller: controller,
		context: context,
		startrow: start,
		rows: rows
	});
}

$(document).off('click', '.entityos-page, .myds-page')
.on('click', '.entityos-page, .myds-page', entityos._util.view.handlers['entityos-page']);

String.prototype.formatXHTML = function(bDirection)
{
	var sValue = this;
	
	var aFind = [
		String.fromCharCode(8220),
		String.fromCharCode(8221),
		String.fromCharCode(8216),
		String.fromCharCode(8217),
		String.fromCharCode(8211),
		String.fromCharCode(8212),
		String.fromCharCode(189),
		String.fromCharCode(188),
		String.fromCharCode(190),
		String.fromCharCode(169), 
		String.fromCharCode(174),
		String.fromCharCode(8230)
	];	

	var aReplace = [
		'"',
		'"',
		"'",
		"'",
		"-",
		"--",
		"1/2",
		"1/4",
		"3/4",
		"(C)",
		"(R)",
		"..."
	];

	if (bDirection)
	{
		sValue = sValue.replace(/\&/g,'&amp;');
		sValue = sValue.replace(/</g,'&lt;');
		sValue = sValue.replace(/>/g,'&gt;');
		sValue = sValue.replace(/-/g, '&#45;');
		sValue = sValue.replace(/@/g, '&#64;');
		sValue = sValue.replace(/\//g, '&#47;');
		sValue = sValue.replace(/"/g, '&quot;');
		sValue = sValue.replace(/\\/g, '&#39;');
	}
	else
	{
		sValue = sValue.replace(/\&amp;/g,'&');
		sValue = sValue.replace(/\&lt;/g,'<');
		sValue = sValue.replace(/\&gt;/g,'>');
		sValue = sValue.replace(/\&#45;/g, '-');
		sValue = sValue.replace(/\&#64;/g, '@');
		sValue = sValue.replace(/\&#47;/g, '/');
		sValue = sValue.replace(/\&quot;/g, '"');
		sValue = sValue.replace(/\&#39;/g, '\'');
		sValue = sValue.replace(/\&#60;/g,'<');
		sValue = sValue.replace(/\&#62;/g,'>');
		sValue = sValue.replace(/\&#244;/g,'\'');
		sValue = sValue.replace(/[\u0092]/g,'\'');

		for ( var i = 0; i < aFind.length; i++ ) 
		{
			var regex = new RegExp(aFind[i], "gi");
			sValue = sValue.replace(regex, aReplace[i]);
		}
	}
	
	return sValue;
};

entityos._util.controller = 
{
	data:
	{
		whoami: [],
		unknown: [],
		note: {},
		build: {},
		last: undefined
	},

	code: {},

	exists: function (param)
	{
		var name;
		var returnData;

		if (_.isObject(param))
		{
			name = entityos._util.param.get(param, 'name').value;
		}
		else
		{
			name = param;
		}

		return (entityos._util.controller.code[name] != undefined)
	},

	invoke: function (param, controllerParam, controllerData)
	{
		var namespace;
		var name;
		var returnData;

		if (_.isObject(param))
		{
			name = entityos._util.param.get(param, 'name').value;
			namespace = entityos._util.param.get(param, 'namespace').value;
		}
		else
		{
			name = param;
		}
		
		if (namespace == undefined) {namespace = window[entityos._scope.app.options.namespace]};
		if (namespace == undefined) {namespace = window.app}

		if (name != undefined)
		{
			var whoami = _.find(entityos._util.controller.data.whoami, function (whoami) {return whoami.name == name});

			if (whoami != undefined)
			{
				whoami['invoked'] = 
					numeral(whoami['invoked']).value() + 1
			}
			else
			{
				entityos._util.controller.data.unknown.push(
				{
					name: name,
					param: param,
					data: controllerData
				});
			}

			entityos._util.data.set(
			{
				controller: name,
				context: '_param',
				value: controllerParam
			});

			if (_.isFunction(entityos._util.controller.code[name]))
			{
				entityos._util.controller.data.last = name;
				returnData = entityos._util.controller.code[name](controllerParam, controllerData);
			}
			else
			{
				if (_.has(namespace.controller, name))
				{
					entityos._util.controller.data.last = name;
					returnData = namespace.controller[name](controllerParam, controllerData);
				}
				else
				{
					returnData = 'No controller named ' + name;

					entityos._util.log.add(
					{
						message: 'There is no controller named: ' + name
					})
					
					if (!_.isUndefined(controllerParam))
					{
						entityos._util.log.add(
						{
							message: controllerParam
						});
					}

					if (!_.isUndefined(controllerData))
					{
						entityos._util.log.add(
						{
							message: controllerData
						});
					}
				}
			}
		}

		return returnData
	},

	add: function(param)
	{
		if (_.isArray(param))
		{
			var namespace;

			_.each(param, function(controller)
			{
				if (controller.name != undefined)
				{
					entityos._util.controller.data.whoami.push( 
					{
						name: controller.name,
						invoked: 0,
						note: (controller.note==undefined?'':controller.note),
						build: (controller.build==undefined?[]:controller.build)
					});

					if (controller.note != undefined)
					{
						entityos._util.controller.data.note[controller.name] = controller.note;
					}

					if (controller.build != undefined)
					{
						if (!_.isArray(controller.build)) {controller.build = [controller.build]}
						entityos._util.controller.data.build[controller.name] = controller.build;
					}
	
					namespace = controller.namespace;
					if (namespace == undefined) {namespace = entityos._scope.app.options.namespace};
					if (namespace == undefined) {namespace = window.app}
					
					//if (namespace.controller == undefined) {namespace.controller = {}}
						
					if (entityos._util.controller.code[controller.name] != undefined)
					{
						entityos._util.controller.code[controller.name + '_'] = _.clone(entityos._util.controller.code[controller.name]);
						entityos._util.log.add({message: 'Existing controller [' + controller.name + '] was just replaced - existing controller renamed to [' + controller.name + '_]'})
					}

					entityos._util.controller.code[controller.name] = controller.code;

					if (controller.alias != undefined && namespace != undefined)
					{
						if (namespace[controller.alias] == undefined)
						{
							namespace[controller.alias] = function(controllerParam, controllerData)
							{
								return entityos._util.controller.invoke(controller.name, controllerParam, controllerData)
							}
						}
					}

					if (controller.data != undefined)
					{
						entityos._util.data.set(
						{
							controller: controller.name,
							merge: true,
							value: controller.data
						})
					}
				}
			});
		}
		else
		{
			var name = entityos._util.param.get(param, 'name').value;
			var code = entityos._util.param.get(param, 'code').value;
			var note = entityos._util.param.get(param, 'note').value;
			var alias = entityos._util.param.get(param, 'alias').value;
			var build = entityos._util.param.get(param, 'build').value;
			var data = entityos._util.param.get(param, 'data').value;

			var namespace = entityos._util.param.get(param, 'namespace').value;
			if (namespace == undefined) {namespace = entityos._scope.app.options.namespace};
			if (namespace == undefined) {namespace = window.app}

			//if (namespace.controller == undefined) {namespace.controller = {}}

			if (name != undefined)
			{
				entityos._util.controller.data.whoami.push( 
				{
					name: name,
					invoked: 0,
					note: (note==undefined?'':note),
					build: (build==undefined?[]:build)
				});

				if (note != undefined)
				{
					entityos._util.controller.data.note[name] = note;
				}

				if (build != undefined)
				{
					entityos._util.controller.data.build[name] = build;
				}

				if (entityos._util.controller.code[name] != undefined)
				{
					entityos._util.controller.code[name + '_'] = entityos._util.controller.code[name];
					entityos._util.log.add({message: 'Existing controller [' + name + '] was just replaced - existing controller renamed to [' + name + '_]'});
				}

				entityos._util.controller.code[name] = code;
			}

			if (alias != undefined && namespace != undefined)
			{
				if (namespace[alias] == undefined)
				{
					namespace[alias] = function(param, controllerParam, controllerData)
					{
						entityos._util.controller.invoke(param, controllerParam, controllerData)
					}
				}
			}

			if (data != undefined)
			{
				entityos._util.data.set(
				{
					controller: name,
					merge: true,
					value: data
				})
			}
		}
	}
}

entityos._util.view.more = function (response, param)
{
	var controller = entityos._util.param.get(param, 'controller').value;
	var scope = entityos._util.param.get(param, 'scope').value;
	var queue = entityos._util.param.get(param, 'queue').value;
	var context = entityos._util.param.get(param, 'context').value;
	var button = $('button[data-id="' + response.moreid + '"]');
	var styles = entityos._scope.app.options.styles;
	var buttonClass = 'btn btn-default btn-sm';
	var orientation = entityos._util.param.get(param, 'orientation', {"default": 'vertical'}).value;
	var progressive = entityos._util.param.get(param, 'progressive', {"default": true}).value;
	var containerID = entityos._util.param.get(param, 'containerID').value;
	var showAlways = entityos._util.param.get(param, 'showAlways', {"default": false}).value;
	var showFooter = entityos._util.param.get(param, 'showFooter', {"default": true}).value;

	var pageRows = entityos._util.param.get(param, 'rows').value;

	if (pageRows == undefined)
	{
		pageRows = entityos._scope.app.options.rows;
	}

	var pageRowsSelections = entityos._util.param.get(param, 'rowsSelections').value;
	
	if (pageRowsSelections == undefined)
	{
		pageRowsSelections = entityos._scope.app.options.rowsSelections;
	}

	if (scope == undefined) {scope = queue}

	if (containerID != undefined)
	{
		queue = containerID;
		param = entityos._util.param.set(param, 'queue', queue);
		entityos._util.view.queue.clear({queue: queue})
	}

	if (_.isObject(styles))
	{
		if (!_.isUndefined(styles.button))
		{
			buttonClass = styles.button;
		}
	}

	if (_.isUndefined(controller)) {controller = queue}

	if (_.isUndefined(entityos._scope.data[scope]))
	{
		entityos._scope.data[scope] = {}
	}

	entityos._scope.data[scope]._retrieve = _.clone(response);

	if (orientation == 'vertical')
	{
		if (response.morerows == 'true' && !_.isUndefined(scope))
		{
			entityos._util.view.queue.add('<div class="text-center m-b m-t mb-2 mt-2">' +
      					'<button class="' + buttonClass + ' entityos-more myds-more" data-id="' + response.moreid + '"' +
      					' data-start="' + (_.toNumber(response.startrow) + _.toNumber(response.rows)) + '"' +
      					' data-rows="' + response.rows + '"' +
      					' data-context="' + context + '"' +
      					' data-controller="' + controller + '">' +
        					'Show More</button></div>', param);

			if (_.isObject(entityos._scope.data[scope]))
			{
				if (!_.isUndefined(entityos._scope.data[scope].count))
				{
					if (showFooter)
					{
						entityos._util.view.queue.add('<div class="text-center m-b mb-2 small text-muted"><span class="entityos-info myds-info" data-id="' + response.moreid + '">' +
										(_.toNumber(response.startrow) + _.toNumber(response.rows)) + ' of ' + entityos._scope.data[scope].count + '</span></div>', param);
					}
				};
			}

			button.removeClass('disabled');
			button.blur();
		}
		else
		{
			if (showFooter)
			{
				entityos._util.view.queue.add('<div class="text-center m-b m-t mb-2 mb-2 small text-muted">' +
									'All ' + entityos._scope.data[scope].count + ' shown</div>', param);
			}
		}
	}
	else //horizontal
	{
		var data = entityos._util.data.get(
		{
			controller: scope
		});

		var rowsTotal = data.count;
		var rowsCurrent = data.all.length;
		var pagesCurrent = Math.ceil(_.toNumber(rowsCurrent) / _.toNumber(pageRows));
		var pagesTotal = Math.ceil(_.toNumber(rowsTotal) / _.toNumber(pageRows));
		var startRow = response.startrow;

		var currentPage = entityos._util.data.get(
		{
			scope: 'util-view-table',
			context: context,
			name: 'currentPage'
		});

		if (currentPage == undefined)
		{
			currentPage = Math.ceil((_.toNumber(startRow) + _.toNumber(pageRows)) / _.toNumber(pageRows));
		}

		currentPage = _.toNumber(currentPage);
		
		var allPagesTotal = pagesTotal;
		var showPagesTotal = currentPage;
		var showPagesMaximum;

		if (data._param != undefined)
		{
			if (data._param.options != undefined)
			{
				showPagesMaximum = data._param.options.countPagesAtStart
			}
		}

		if (showPagesMaximum == undefined)
		{
			showPagesMaximum = (progressive?0:10)
		}

		if (showPagesTotal < showPagesMaximum) {showPagesTotal = showPagesMaximum} 

		if (!progressive)
		{
			if (pagesTotal > showPagesTotal) //20
			{
				pagesTotal = showPagesTotal;
			}
		}

		var bPrevious = false;
		var bNext = true;

		if (currentPage != 1)
		{
			bPrevious = true
		}

		if (currentPage == pagesTotal)
		{
			bNext = false
		}

		if (progressive)
		{
			if (data._pages == undefined)
			{
				data._pages = []
			}

			var page = $.grep(data._pages, function (page) {return page.number == currentPage})[0];

			if (page == undefined)
			{
				page =
				{
					number: currentPage,
					start: startRow,
					rows: pageRows
				}

				data._pages.push(page)
			}
		}
		else
		{
			//data._pages = _.times(pagesTotal, function(p)
			data._pages = _.times(allPagesTotal, function(p)
			{
				return {number: p+1, start: (pageRows * p), rows: pageRows}
			});
		}

		var html = [];

		html.push('<nav aria-label="page navigation">' +
						  	'<ul class="pagination justify-content-center">');

		if (!progressive)
		{
			html.push('<li class="page-item' + (bPrevious?'':' disabled') + ' entityos-previous myds-previous"' +
									' data-id="' + response.moreid + '"' +
									'>' +
							   	'<a class="page-link entityos-page myds-page" aria-label="Previous"' +
							   	' data-id="' + response.moreid + '"' +
						      	' data-page="' + (_.toNumber(currentPage) - 1) + '"' +
									' data-pages="' + allPagesTotal + '"' +
									' data-show-pages="' + showPagesTotal + '"' +
									' data-show-pages-maximum="' + showPagesMaximum + '"' +
									' data-start="' + (_.toNumber(startRow) - _.toNumber(pageRows)) + '"' +
									' data-rows="' + pageRows + '"' +
									' data-controller="' + controller + '"' +
		      					' data-context="' + context + '"' +
							   	(bPrevious?' style="cursor:pointer;"':'') +
							   	' data-id="' + response.moreid + '"' +
							   	'>' +
							        	'<span aria-hidden="true">&laquo;</span>' +
							        	'<span class="sr-only">Previous</span>' +
							      '</a>' +
							   '</li>');
		}	

		var firstShowPage = (showPagesTotal - showPagesMaximum) + 1;
		var lastShowPage = (showPagesTotal)

		if (currentPage < firstShowPage)
		{
			firstShowPage = currentPage
			lastShowPage = firstShowPage + showPagesMaximum
		}

		if ((currentPage + 1) > (showPagesMaximum/2))
		{
			if ((currentPage + (showPagesMaximum/2)) > allPagesTotal)
			{
				firstShowPage = allPagesTotal - showPagesMaximum
				lastShowPage = allPagesTotal
			}
			else
			{
				firstShowPage = currentPage - (showPagesMaximum / 2);
				lastShowPage = currentPage + (showPagesMaximum / 2)
			}
		}

		$.each(data._pages, function (p, page)
		{
			html.push('<li class="page-item' + (page.number==currentPage?' active':'') + 
								((page.number >= firstShowPage) && (page.number <= lastShowPage)?'':' hidden d-none') + '"' +
								' data-page="' + page.number + '"' +
								' data-id="' + response.moreid + '">' +
								'<a class="page-link entityos-page myds-page" style="cursor:pointer;"' +
								' data-page="' + page.number + '"' +
								' data-pages="' + allPagesTotal + '"' +
								' data-show-pages="' + showPagesTotal + '"' +
								' data-show-pages-maximum="' + showPagesMaximum + '"' +
								' data-id="' + response.moreid + '"' +
								' data-start="' + page.start + '"' +
								' data-rows="' + page.rows + '"' +
								' data-controller="' + controller + '"' +
	      					' data-context="' + context + '"' +
								'>' + page.number + '</a></li>');
		});

		if (progressive)
		{	
			if (bNext)
			{
				html.push('<li class="page-item">' +
						      '<a class="page-link entityos-more entityos-page myds-more myds-page" aria-label="Next" style="cursor:pointer;"' +
						      	' data-id="' + response.moreid + '"' +
						      	' data-start="' + (_.toNumber(response.startrow) + _.toNumber(response.rows)) + '"' +
	      						' data-rows="' + response.rows + '"' +
	      						' data-controller="' + controller + '"' +
	      						' data-context="' + context + '"' +
						      '>More' +
						      '</a>' +
						   '</li>');
			}
						   
			html.push('</ul></nav>');
		}
		else
		{
			if (response.morerows == 'false')
			{
				allPagesTotal = currentPage
			}

			if (currentPage < allPagesTotal)
			{
				html.push('<li class="page-item entityos-next myds-next">' +
						      '<a class="page-link entityos-page myds-page" aria-label="Next" style="cursor:pointer;"' +
						      	' data-id="' + response.moreid + '"' +
						      	' data-page="' + (_.toNumber(currentPage) + 1) + '"' +
									' data-pages="' + allPagesTotal + '"' +
									' data-show-pages="' + showPagesTotal + '"' +
									' data-show-pages-maximum="' + showPagesMaximum + '"' +
									' data-start="' + (_.toNumber(startRow) + _.toNumber(pageRows)) + '"' +
									' data-rows="' + pageRows + '"' +
									' data-controller="' + controller + '"' +
		      					' data-context="' + context + '"' +
						      	'>' +
						        	'<span aria-hidden="true">&raquo;</span>' +
						        	'<span class="sr-only">More</span>' +
						      '</a>' +
						   '</li>' +
						  '</ul>' +
						'</nav>');

			}
			else
			{
				html.push('<li class="page-item' + (bNext?'':' disabled') + ' entityos-next myds-next"' +
								' data-id="' + response.moreid + '"' +
								'>' +
						      '<a class="page-link entityos-page myds-page" aria-label="Next"' +
						      	' data-id="' + response.moreid + '"' +
						      	' data-page="' + (_.toNumber(currentPage)) + '"' +
									' data-pages="' + allPagesTotal + '"' +
									' data-show-pages="' + showPagesTotal + '"' +
									' data-show-pages-maximum="' + showPagesMaximum + '"' +
									' data-start="' + (_.toNumber(startRow) + _.toNumber(pageRows)) + '"' +
									' data-rows="' + pageRows + '"' +
									' data-controller="' + controller + '"' +
		      					' data-context="' + context + '"' +
						      	(bNext?' style="cursor:pointer;"':'') + '>' +
						        	'<span aria-hidden="true">&raquo;</span>' +
						        	'<span class="sr-only">More</span>' +
						      '</a>' +
						   '</li>' +
						  	'</ul>' +
						'</nav>');
			}	
		}

		entityos._util.view.queue.add('<div class="text-center small text-muted" data-id="' + response.moreid + '">' + 
									html.join('') + '</div>', param);

		var html = [];

		if (_.isArray(pageRowsSelections))
		{
			html.push(
						'<div class="dropdown text-center m-x-auto mx-auto" style="width:150px;">' +
								'<a class="dropdown-toggle text-muted"' +
								' href="#" role="button" id="entityos-page-rows-selection-' + response.moreid + '"' +
								' style="padding-top: 2px; padding-bottom: 2px; margin-right: 6px;" ' +
								' data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">' +
								' <span class="entityos-dropdown-text myds-dropdown-text text-muted">' + pageRows + ' rows per page</span><span class="caret"></span></a>' +
			 				' <ul class="dropdown-menu m-x-auto" aria-labelledby="entityos-page-rows-selection-' + response.moreid + '">' +
			 				' <li><div class="dropdown-header text-muted" style="font-size:0.75rem; padding-bottom:2px;">Rows Per Page</div></li>');

			_.each(pageRowsSelections, function (pageRowsSelection)
			{
				html.push('<li><a class="dropdown-item entityos-page-rows myds-page-rows" href="#" ' +
							' data-controller="util-view-table"' +
							' data-context="' + context + '" ' +
							' data-rowsperpage="' + pageRowsSelection + '">' + pageRowsSelection + '</a></li>');
			});
	
			html.push(		'</ul>' +
						'</div>');
		}

		entityos._util.view.queue.add('<div class="text-center m-b mb-2 small text-muted" data-id="' + response.moreid + '">' + 
									html.join('') + '</div>', param);
	}

	if (containerID != undefined)
	{
		if (showAlways || allPagesTotal != 1)
		{
			entityos._util.view.queue.render('#' + containerID, param);
		}	
	}
}

entityos._util.view.showPage = function (param)
{
	var number = entityos._util.param.get(param, 'number').value;
	var pages = entityos._util.param.get(param, 'pages').value;
	var context = entityos._util.param.get(param, 'context').value;
	var showPages = entityos._util.param.get(param, 'showPages').value;
	var showPagesMaximum = entityos._util.param.get(param, 'showPagesMaximum').value;
	var id = entityos._util.param.get(param, 'id').value;

	if (number != undefined)
	{
		entityos._util.data.set(
		{
			scope: 'util-view-table',
			context: context,
			name: 'currentPage',
			value: number
		});

		if (pages == number)
		{
			$('li.entityos-next[data-id="' + id + '"]').addClass('disabled');
			$('li.entityos-next[data-id="' + id + '"] a').removeAttr('style');
            $('li.myds-next[data-id="' + id + '"]').addClass('disabled');
			$('li.myds-next[data-id="' + id + '"] a').removeAttr('style');
		}
		else
		{
			$('li.entityos-next[data-id="' + id + '"]').removeClass('disabled');
			$('li.entityos-next[data-id="' + id + '"] a').attr('style', 'cursor:pointer;');
            $('li.myds-next[data-id="' + id + '"]').removeClass('disabled');
			$('li.myds-next[data-id="' + id + '"] a').attr('style', 'cursor:pointer;');
		}

		if (number == 1)
		{
			$('li.entityos-previous[data-id="' + id + '"]').addClass('disabled');
			$('li.entityos-previous[data-id="' + id + '"] a').removeAttr('style');
            $('li.myds-previous[data-id="' + id + '"]').addClass('disabled');
			$('li.myds-previous[data-id="' + id + '"] a').removeAttr('style');
		}
		else
		{
			$('li.entityos-previous[data-id="' + id + '"]').removeClass('disabled');
			$('li.entityos-previous[data-id="' + id + '"] a').attr('style', 'cursor:pointer;');
            $('li.myds-previous[data-id="' + id + '"]').removeClass('disabled');
			$('li.myds-previous[data-id="' + id + '"] a').attr('style', 'cursor:pointer;');
		}

		if ($('div.entityos-page-view[data-page="' + number + '"][data-context="' + context + '"]').length != 0 
				|| $('div.myds-page-view[data-page="' + number + '"][data-context="' + context + '"]').length != 0)
		{
			$('div.entityos-page-view[data-context="' + context + '"]').hide();
			$('div.entityos-page-view[data-page="' + number + '"][data-context="' + context + '"]').show();
            $('div.myds-page-view[data-context="' + context + '"]').hide();
			$('div.myds-page-view[data-page="' + number + '"][data-context="' + context + '"]').show();

			$('li.page-item[data-id="' + id + '"]').removeClass('active');
			$('li.page-item[data-id="' + id + '"][data-page="' + number + '"]').addClass('active');
			$('li.page-item[data-id="' + id + '"][data-page="' + number + '"]').removeClass('hidden d-none');

			var previous = $('li.entityos-previous a, li.myds-previous a')
			if (previous.length != 0)
			{
				var previousPage = parseInt(previous.attr('data-page'));

				if (number != 1)
				{
					previous.attr('data-page', (parseInt(number) - 1))
				}
			}

			var next = $('li.entityos-next a, li.myds-next a')
			if (next.length != 0)
			{
				var nextPage = parseInt(next.attr('data-page'));

				if (number != pages)
				{
					next.attr('data-page', (parseInt(number) + 1))
				}
			}

			var currentPage = _.toNumber(number);
			var firstShowPage = 1;
			var lastShowPage = _.toNumber(showPagesMaximum);
			var allPagesTotal = _.toNumber(pages);
			showPagesMaximum = _.toNumber(showPagesMaximum);

			var shownPages = (parseInt(pages) - parseInt(number) + 1); //check

			if ((currentPage + 1) > (showPagesMaximum/2))
			{
				if ((currentPage + (showPagesMaximum/2)) > allPagesTotal)
				{
					firstShowPage = allPagesTotal - showPagesMaximum
					lastShowPage = allPagesTotal
				}
				else
				{
					firstShowPage = currentPage - (showPagesMaximum / 2);
					lastShowPage = currentPage + (showPagesMaximum / 2)
				}
			}

			$('div[data-id="' + id + '"] li.page-item[data-page]').addClass('hidden d-none');

			_.each(_.range(firstShowPage, lastShowPage + 1), function (pageNumber)
			{
				$('div[data-id="' + id + '"] li.page-item[data-page="' + _.toString(pageNumber) + '"]').removeClass('hidden d-none');
			})

			if (shownPages > parseInt(showPagesMaximum))
			{	
				//$('li.page-item[data-page="' + (parseInt(number) + parseInt(showPagesMaximum) ) + '"]').addClass('hidden d-none');

				$('li.entityos-next[data-id="' + id + '"]').removeClass('disabled');
				$('li.entityos-next[data-id="' + id + '"] a').attr('style', 'cursor:pointer;');
                $('li.myds-next[data-id="' + id + '"]').removeClass('disabled');
				$('li.myds-next[data-id="' + id + '"] a').attr('style', 'cursor:pointer;');
			}

			var onComplete = entityos._util.data.get(
			{
				scope: context,
				context: '_param',
				name: 'onComplete'
			});
			
			entityos._util.onComplete({onComplete: onComplete});
		}
		else
		{
			$('li.page-item[data-id="' + id + '"]').addClass('disabled');
			entityos._util.view.moreSearch(param)
		}
	}
}

entityos._util.view.moreSearch = function (param)
{
	var controller = entityos._util.param.get(param, 'controller').value;
	var controllerParam = entityos._util.param.get(param, 'controllerParam').value;

	var queue = entityos._util.param.get(param, 'queue').value;

	if (!_.isUndefined(controller))
	{
		if (!_.isFunction(controller))
		{
			controller = entityos._util.controller.code[controller];
		}

		if (_.isFunction(controller))
		{	
			entityos._util.send(
			{
				data: param,
				callback: controller,
				callbackParam: controllerParam,
				type: 'POST',
				url: '/rpc/core/?method=CORE_SEARCH_MORE',
			});
		}	
	}	
}

if (entityos._util.data == undefined) {entityos._util.data = {}}

entityos._util.data.find = function (param)
{
	var controller = entityos._util.param.get(param, 'controller').value;
	var scope = entityos._util.param.get(param, 'scope').value;

	var context = entityos._util.param.get(param, 'context').value;
	
	var dataController = entityos._util.param.get(param, 'dataController', {'default': 'setup'}).value;
	var dataController = entityos._util.param.get(param, 'dataController', {'default': 'setup'}).value;
	var dataContext = entityos._util.param.get(param, 'dataContext').value; 
	
	if (controller == undefined) {controller = scope}

	if (dataContext == undefined && dataController == 'setup')
	{
		dataContext = context;
	}
		
	var name = entityos._util.param.get(param, 'name').value;
	var id = entityos._util.param.get(param, 'id').value;
	var returnValue = entityos._util.param.get(param, 'valueDefault').value;
	
	if (context != undefined)
	{
		if (id == undefined && controller != undefined)
		{
			id = entityos._util.data.get(
			{
				controller: controller,
				context: context
			});
		}
		
		var data = entityos._util.data.get(
		{
			controller: dataController,
			context: dataContext
		});
		
		if (data != undefined)
		{
			var _id = id;
				
			if (!_.isArray(_id))
			{	
				_id = _.split(id, ',');
			}
			
			if (_.size(_id) == 1)
			{
				var value = _.find(data, function (d) {return d.id == _id[0]})

				if (name != undefined && value != undefined)
				{
					returnValue = value[name]
				}
			}
			else
			{
				var _values = [];
				var _value;
				
				_.each(_id, function (id)
				{
					_value = _.find(data, function (d) {return d.id == id})

					if (name != undefined && _value != undefined)
					{
						_values.push(_value[name]);
					}
				})
				
				returnValue = _.join(_values, ', ');
			}
		}
	}
	
	return returnValue;
}

entityos._util.view.set = function (param)
{
	var controller = entityos._util.param.get(param, 'controller').value;
	var scope = entityos._util.param.get(param, 'scope').value; 
	var context = entityos._util.param.get(param, 'context').value;
	var value = entityos._util.param.get(param, 'value').value;
	var id = entityos._util.param.get(param, 'id').value;
	var contexts = entityos._util.param.get(param, 'contexts', {"default": []}).value;

	if (controller == undefined) {controller = scope}

	if (_.isEmpty(contexts))
	{
		contexts.push(
		{
			name: context,
			value: value
		});
	}

	_.each(contexts, function (context)
	{
		var element = $('[data-controller="' + controller + '"][data-context="' + context.name + '"]');

		if (!_.isEmpty(element))
		{
			if (_.isUndefined(context.value)) {context.value = ''};

            if (_.isObject(window.he))
            {
			    context.value = he.decode(context.value);
            }
            else if (_.isFunction(_.unescapeHTML))
            {
                context.value = _.unescapeHTML(context.value);
            }
            else
            {
                context.value = _.unescape(context.value);
            }

			if (element.hasClass('entityos-text') || element.hasClass('entityos-select') || element.hasClass('myds-text') || element.hasClass('myds-select'))
			{
				element.val(context.value);
			}
			else if (element.hasClass('entityos-text-select') || element.hasClass('myds-text-select'))
			{
				element.val(context.value);
				element.attr('data-id', context.id);
			}
			else if (element.hasClass('entityos-check') || element.hasClass('myds-check'))
			{
				element.filter('[value="' + context.value + '"]').prop('checked', true);
			}
			else
			{
				element.val(context.value);
				element.html(context.value);
			}

			entityos._util.data.set(
			{
				controller: controller,
				context: context.name,
				value: (_.isUndefined(context.id)?context.value:context.id)
			});
		}
	});
}

entityos._util.view.clear = function (param)
{
	var selector;

	if (_.isObject(param))
	{
		selector = entityos._util.param.get(param, 'selector').value;
	}
	else
	{
		selector = param;
	}

	if (selector != undefined)
	{
		$(selector).html('')
	}
}

entityos._util.view.refresh = function (param)
{
	if (_.isArray(param))
	{
		_.each(param, function(_param)
		{
			entityos._util.view._refresh(_param)
		})
	}
	else
	{
		entityos._util.view._refresh(param)
	}
}

entityos._util.view._refresh = function (param)
{
	var scope = entityos._util.param.get(param, 'scope').value;
	var controller = entityos._util.param.get(param, 'controller').value;
	var data = entityos._util.param.get(param, 'data').value;
	var routeTo = entityos._util.param.get(param, 'routeTo').value;
	var show = entityos._util.param.get(param, 'show').value;
	var hide = entityos._util.param.get(param, 'hide').value;
	var template = entityos._util.param.get(param, 'template').value;
	var selector = entityos._util.param.get(param, 'selector').value;
	var dataScope = entityos._util.param.get(param, 'dataScope').value;
	var dataController = entityos._util.param.get(param, 'dataController').value;
	var resetScope = entityos._util.param.get(param, 'resetScope', {default: false}).value;
	var resetScopeNew = entityos._util.param.get(param, 'resetScopeNew', {default: true}).value;
	var validate = entityos._util.param.get(param, 'validate', {default: true}).value;
	var hidePopover = entityos._util.param.get(param, 'hidePopover', {default: true}).value;
	var disable = entityos._util.param.get(param, 'disable').value;
	var enable = entityos._util.param.get(param, 'enable').value;
	var collapse = entityos._util.param.get(param, 'collapse').value;
	var onlyIfVisible = entityos._util.param.get(param, 'onlyIfVisible', {default: true}).value;
	var reset = entityos._util.param.get(param, 'reset', {default: false}).value;
	var resetNew = entityos._util.param.get(param, 'resetNew', {default: false}).value;
	
	var includeDates = entityos._util.param.get(param, 'includeDates', {default: true}).value;

	if (_.isUndefined(template) && !_.isUndefined(selector)) {template = true}

	if (_.isUndefined(scope)) {scope = controller}
	if (_.isUndefined(controller))
	{
		entityos._util.param.set(param, 'controller', scope)
	}

	if (!_.isUndefined(dataScope) && !_.isUndefined(data))
	{
		var dataScopeAll = entityos._util.data.get(
		{
			scope: dataScope,
			context: 'all',
			valueDefault: []
		});

		var dataInScopeAll = _.find(dataScopeAll, function (d) {return d.id == data.id});
		var utilViewParam = entityos._util.data.get(
		{
			scope: dataScope,
			context: '_param'
		});

		if (!_.isUndefined(utilViewParam))
		{
			if (_.isUndefined(dataController))
			{
				if (_.has(utilViewParam, 'format.row.controller'))
				{
					dataController = utilViewParam.format.row.controller;
				}
			}

			if (_.has(utilViewParam, 'format.row.method'))
			{
				utilViewParam.format.row.method(data);
			}
		}

		if (!_.isUndefined(dataController))
		{
			entityos._util.controller.invoke(dataController, data)
		}

		if (_.isUndefined(dataInScopeAll))
		{
			dataScopeAll.push(data);
		}
		else
		{
			dataInScopeAll = _.assign(dataInScopeAll, data);
		}
	}

	if (resetScope && scope != undefined)
	{
		entityos._util.data.reset({scope: scope})
	}

	if (resetScopeNew && scope != undefined)
	{
		entityos._util.data.reset({scope: scope + '-'})
	}

	if (template)
	{
		entityos._util.view.queue.templateRender(param);

		var context;
		var value;

		_.each($(selector + ' input.entityos-check[data-context][data-id], ' + selector + ' input.myds-check[data-context][data-id]'),
			function (element)
		{
			var context = $(element).data('context');

			var value = '';
            
            if (_.isSet(data))
            {
                value = data[context];
            }

			if (value != undefined)
			{
				$(selector + ' input.entityos-check[data-context="' + context + '"][data-id="' + value + '"], ' + selector + ' input.myds-check[data-context="' + context + '"][data-id="' + value + '"]').attr('checked', 'checked')
			}
		});

		_.each($(selector + ' input.entityos-check[data-context][data-selected-id], ' + selector + ' input.myds-check[data-context][data-selected-id]'),
			function (element)
		{
			var context = $(element).data('context');
			var value = data[context];

			if (value != undefined)
			{
				$(selector + ' input.entityos-check[data-context="' + context + '"][data-selected-id="' + value + '"], ' + selector + ' input.myds-check[data-context="' + context + '"][data-selected-id="' + value + '"]').attr('checked', 'checked')
			}
		});

		_.each($(selector + ' input.entityos-select[data-context][value], ' + selector + ' input.myds-select[data-context][value]'),
			function (element)
		{
			var context = $(element).data('context');
			var value = data[context];

			if (value != undefined)
			{
				$(selector + ' input.entityos-select[data-context="' + context + '"][value="' + value + '"], ' + selector + ' input.myds-select[data-context="' + context + '"][value="' + value + '"]').attr('checked', 'checked')
			}
		});
	}

	if (!_.isUndefined(data) && !_.isUndefined(scope))
	{
		_.each(data, function (value, key)
		{
			$('[data-scope="' + scope + '"][data-context="' + key + '"]').html(value);
		});

		if (_.has(data, 'id'))
		{			
			var elementIDs = $('[data-scope="' + scope + '-' + '"][data-id]');
			var elementID;

			_.each(elementIDs, function (element)
			{
				if (!$(element).hasClass('entityos-check') && !$(element).hasClass('myds-check'))
				{
					elementID = $(element).attr('id');
					$(element).attr('data-id', data.id);
					$(element).attr('id', elementID + data.id);
					$(element).attr('data-scope', scope + '-' + data.id);
				}
			});

			elementIDs = $('input[data-scope="' + scope + '-' + data.id + '"][data-value]');
			var elementContext;
			var elementValue;

			_.each(elementIDs, function (element)
			{
				if (!$(element).hasClass('entityos-text-select') && !$(element).hasClass('myds-text-select'))
				{
					elementContext = $(element).attr('data-context');

					if (elementContext != undefined)
					{
						elementValue = data[elementContext];
						if (elementValue == undefined) {elementValue = ''}

						$(element).attr('data-value', elementValue);
                        elementValue = entityos._util.decode(elementValue);
						$(element).val(elementValue);
					}
				}
			});

			elementIDs = $('textarea[data-scope="' + scope + '-' + data.id + '"]');
			var elementContext;
			var elementValue;

			_.each(elementIDs, function (element)
			{
				elementContext = $(element).attr('data-context');

				if (elementContext != undefined)
				{
					elementValue = data[elementContext];
					if (elementValue == undefined) {elementValue = ''}
                    elementValue = _.unescape(elementValue);
					$(element).val(elementValue);
				}
			});
		}
	}

	if (reset)
	{
		$('input[data-scope="' + scope + '"]').val('');
		$('textarea[data-scope="' + scope + '"]').val('');
	}

	if (resetNew)
	{
		$('input[data-scope="' + scope + '-"]').val('');
		$('textarea[data-scope="' + scope + '-"]').val('');
	}

	if (!_.isUndefined(show))
	{
		$(show).removeClass('hidden d-none');
	}
	
	if (!_.isUndefined(hide))
	{
		$(hide).addClass('hidden d-none');
	}

	if (!_.isUndefined(disable))
	{
		$(disable).addClass('disabled');
	}
	
	if (!_.isUndefined(enable))
	{
		$(enable).removeClass('disabled');
	}

	if (includeDates)
	{
		var selectorDate = '.entityos-date, .myds-date';
		var selectorDateTime = '.entityos-date-time, .myds-date-tim';

		if (onlyIfVisible)
		{ 
			selectorDate += ':visible';
			selectorDateTime += ':visible';
		}

		entityos._util.view.datepicker({selector: selectorDate, format: 'D MMM YYYY'});
		entityos._util.view.datepicker({selector: selectorDateTime, format: 'D MMM YYYY LT'})
	}

	if (validate)
	{
		entityos._util.validate.check({scope: scope})
	}

	if (hidePopover)
	{
		$('.popover:visible').popover("hide")
	}

	if (_.isObject(collapse))
	{
		if (_.isArray(collapse.contexts))
		{
			_.each(collapse.contexts, function (context)
			{
				$(selector + '-' + context + '-collapse').removeClass('show')
				$('[href="' + selector + '-' + context + '-collapse"] > i').removeClass('fa-chevron-up').addClass('fa-chevron-down');
			});
		}
	}

	if (!_.isUndefined(routeTo))
	{
		window.location.hash = '#' + routeTo
	}
}

entityos._util.controller.add(
{
	name: 'util-view-refresh',
	code: function (param)
	{
		entityos._util.view.refresh(param);
	}
});

entityos._util.controller.add(
{
	name: 'util-view-clear',
	code: function (param)
	{
		entityos._util.view.clear(param);
	}
});

entityos._util.view.datepicker = function (param)
{
	var selector = entityos._util.param.get(param, 'selector').value;
	var format = entityos._util.param.get(param, 'format', {"default": 'D MMM YYYY'}).value;
	var pickerOptions = entityos._util.param.get(param, 'pickerOptions', {"default": {}}).value; 
    var debug = entityos._util.param.get(param, 'debug', {"default": false}).value;

	var datepicker = $(selector).data("DateTimePicker");

	if (_.isObject(datepicker))
	{
		datepicker.destroy();
	}

	var icons =
	{
		previous: 'icon icon-chevron-left fa fa-chevron-left',
		next: 'icon icon-chevron-right fa fa-chevron-right',
		time: "fa fa-clock-o",
		date: "fa fa-calendar",
		up: "fa fa-arrow-up",
		down: "fa fa-arrow-down"
	} 

	if (_.has(entityos, '_scope.app.options.styles.datePicker.icons'))
	{
		icons = entityos._scope.app.options.styles.datePicker.icons
	}

	var options = _.assign({format: format, icons: icons}, pickerOptions);

	if (_.has(entityos, '_scope.app.options.styles.datePicker.options'))
	{
		options = _.assign(options, entityos._scope.app.options.styles.datePicker.options);
	}

	if ($.fn.datetimepicker != undefined)
	{
        if (debug)
        {
            options.debug = true;
        }

		if (!_.includes(selector, ':visible'))
		{
			selector = selector + ':visible'
		}

		if (_.isFunction($(selector).datetimepicker))
		{
			$(selector).datetimepicker(options);
		}
	}
    else if ($.fn.flatpickr != undefined)
	{
        options.enableTime = _.includes(format.toUpperCase(), 'H');
        options.dateFormat = format;
        _.replace(options.dateFormat, 'LT', 'H:i');

        $(selector).flatpickr(options);
    }
}

entityos._util.controller.add(
{
	name: 'util-view-date-picker',
	code: function (param)
	{
		entityos._util.view.datepicker(param);
	}
});

entityos._util.view.popover =
{
	init: function (param)
	{
		var selector = entityos._util.param.get(param, 'selector', {default: '.popover:visible'}).value;
		var title = entityos._util.param.get(param, 'title', {default: ''}).value;
		var isHTML = entityos._util.param.get(param, 'isHTML', {default: true}).value;
		var placement = entityos._util.param.get(param, 'placement', {default: 'auto'}).value;
		var sanitize = entityos._util.param.get(param, 'sanitize', {default: false}).value;
		var options =  entityos._util.param.get(param, 'options', {default: {}}).value;
		var content =  entityos._util.param.get(param, 'content' ).value;
		var text =  entityos._util.param.get(param, 'text').value;
		var showCancel =  entityos._util.param.get(param, 'showCancel', {default: true}).value;
		var buttonClass =  entityos._util.param.get(param, 'buttonClass', {default: 'btn-primary entityos-click entityos-close myds-click myds-close'}).value;
		var buttonData =  entityos._util.param.get(param, 'buttonData', {default: ''}).value;
		var buttonText =  entityos._util.param.get(param, 'buttonText', {default: 'OK'}).value;
		var buttonController =  entityos._util.param.get(param, 'buttonController').value;

		options = _.assign(
		{
			title: title,
			content: content,
			html: isHTML,
			placement: placement,
			sanitize: sanitize
		}, options);

		if (typeof $.fn.popover == 'function')
		{
			if (options.content == undefined)
			{
				options.content = ''
				
				if (text != undefined)
				{
					options.content += '<div class="text-center">' + text + '</div>'
				}

				if (showCancel || buttonController != undefined)
				{
					options.content += '<div class="text-center mt-3 mb-2 m-t m-b">';

					if (showCancel)
					{
						options.content += '<button type="button" class="btn btn-link text-muted entityos-close myds-close" data-context="popover">Cancel</button>';
					}

					if (buttonController != undefined)
					{
						options.content += '<button type="button" class="btn ' + buttonClass + '"' +
										' data-context="popover"' +
										' data-controller="' + buttonController + '"' +
										buttonData +
									'>' + buttonText + '</button>';
					}

					options.content += '</div>';
				}
			}

			$(selector).popover(options);
		}
		else if (typeof $.fn.popConfirm == 'function')
		{
			$(selector).popConfirm(options);
		}
	},

	show: function (param)
	{
		var selector = entityos._util.param.get(param, 'selector', {default: '.popover:visible'}).value;
		$(selector).popover("hide");
	},

	hide: function (param)
	{
		var selector = entityos._util.param.get(param, 'selector', {default: '.popover:visible'}).value;
		$(selector).popover("hide");
	}
}

entityos._util.controller.add(
[
	{
		name: 'util-view-popover',
		code: function (param)
		{
			entityos._util.view.popover.init(param);
		}
	},
	{
		name: 'util-view-popover-hide',
		code: function (param)
		{
			entityos._util.view.popover.hide(param);
			
		}
	},
	{
		name: 'util-view-popover-show',
		code: function (param)
		{
			entityos._util.view.popover.show(param);
			
		}
	},
]);

entityos._util.view.dateFormat = function (param)
{
	var dateFormat = entityos._util.param.get(param, 'format').value;
	var dateCurrentFormat = entityos._util.param.get(param, 'currentFormat').value;
	var date = entityos._util.param.get(param, 'date').value;
	var clean = entityos._util.param.get(param, 'clean', {default: false}).value;
	var dateSet = entityos._util.param.get(param, 'set').value;
	
	if (clean)
	{
		date = date.replace(' 00:00:00', '')
	}

	if (dateCurrentFormat == undefined)
	{
		dateCurrentFormat = entityos._scope.app.options.dateFormats;
	}
	
	if (dateCurrentFormat == undefined)
	{
		dateCurrentFormat = ["D MMMM YYYY", "DD MMMM YYYY", "DD MMM YYYY", "D MMM YYYY", "D/MM/YYYY", "DD/MM/YYYY", "DD MMM YYYY HH:mm:ss"]
	}

	if (date != '' && date != undefined && dateFormat != undefined)
	{
		var _date = moment(date, dateCurrentFormat);

		if (_.isObject(dateSet))
		{
			var method = 'add';
			if (dateSet.direction == 'backwards') {method = 'subtract'}
			if (dateSet.units == undefined) {dateSet.units = 'days'}
			if (dateSet.duration == undefined) {dateSet.duration = 'days'}
		
			_date = _date[method](dateSet.duration, dateSet.units);
		}

		date = _date.format(dateFormat);
	}

	return date;
}

entityos._util.controller.add(
{
	name: 'util-view-date-format',
	code: function (param)
	{
		return entityos._util.view.dateFormat(param);
	}
});

entityos._util.controller.add(
{
	name: 'util-view-date-clean',
	code: function (date)
	{
		if (date != undefined)
		{
			var param = 
			{
				date: date,
				clean: true
			}

			return entityos._util.view.dateFormat(param);
		}
	}
});

entityos._util.controller.add(
{
	name: 'util-date',
	code: function (param)
	{
		var date = entityos._util.param.get(param, 'date').value;
		var modify = entityos._util.param.get(param, 'modify').value;
        var format = entityos._util.param.get(param, 'format', {default: 'D MMM YYYY'}).value;

		if (date == undefined)
		{
			date = moment().format(format)
		}

        if (_.isSet(modify))
        {
            if (!_.isFunction(moment))
            {
                console.log('!! Need reference to moment.js')
            }
            else 
            {
                var _date = moment(date, entityos._scope.app.options.dateFormats)

                if (_date.isValid())
                {
                    _date = _date.add(modify);
                }

                date = _date.format(format);
            }
        }

		var param = _.assign(
        param,
		{
			date: date,
			clean: true
		});

		return entityos._util.view.dateFormat(param);
	}
});

//CHECK
if (entityos._util.data == undefined)
{
	entityos._util.data = {}
}

entityos._util.data.param = 
{
	set: function (controller, param)
	{
		if (controller != undefined && param != undefined)
		{
			entityos._util.data.set(
			{
				controller: controller,
				context: '_param',
				value: param
			});
		}

		return param;
	},

	get: function (controller, param)
	{
		if (controller != undefined)
		{
			var _param = entityos._util.data.get(
			{
				controller: controller,
				context: '_param'
			});

			if (_param != undefined) {param = _param}
		}

		return param;
	}
}

entityos._util.setup = function (param)
{
	return entityos._util.data.get({scope: 'util-setup'});
};

entityos._util.whoami = function (param)
{
	var whoamiData =
	{
		myFunctionality:
		{
			controllers: _.sortBy(entityos._util.controller.data.whoami, function (whoami) {return whoami.name}),
			count: entityos._util.controller.data.whoami.length,
			util: entityos._util,
			viewHanders: entityos._util.view.handlers
		},
		buildingMe: 
		{
			journal: entityos._util.controller.data.build,
			about: entityos._scope.app.build,
			options: entityos._scope.app.options
		},
		myForm: {},
		mySetup: entityos._util.data.get({scope: 'util-setup'})
	}

	var form = [];
	var elements = $('.entityos-view, .myds-view');

	_.each(elements, function (element)
	{
		form.push(
		{
			id: $(element).attr('id'),
			structure: $(element).html()
		})
	});

	whoamiData.myForm.views = form;

	elements = $('.entityos-view-template, .myds-view-templat');
	form = [];

	_.each(elements, function (element)
	{
		form.push(
		{
			id: $(element).attr('id'),
			structure: $(element).html()
		})
	});

	whoamiData.myForm.templates = form;

	whoamiData.buildingMe.todo = {};

	_.each(entityos._util.controller.data.build, function(buildData, controllerName)
	{
		var todos = _.filter(buildData, function (data)
		{
			return data.todo != undefined
		})

		if (todos.length !=0 )
		{
			
			whoamiData.buildingMe.todo[controllerName] = _.map(todos, function (data) {return data.todo})
		}

	});

	_.each(entityos._cloud.log, function (log)
	{
		log._url = log.url.toLowerCase()
		if (_.contains(log._url, 'method='))
		{
			var _method = _.split(log._url, 'method=');
			if (_method.length > 0)
			{
				_method = _.last(_method);
				log._method = _.first(_.split(_method, '&'))
			}
		}
	});

	var cloudIsNextRelease = false;
	var cloudHost = window.location.host.split('.');

	_.each(cloudHost, function (_cloudHost, _ch)
	{
		if (_ch != 0 && !cloudIsNextRelease)
		{
			if (_cloudHost == 'debug' || _cloudHost == 'next' || _cloudHost == 'next-release')
			{
				cloudIsNextRelease = true
			}
		}
	})

	whoamiData.thisInstanceOfMe =
	{
		functionality: {},
		data: {},
		storage: 
		{
			cloud: 
			{
				objects: entityos._cloud.object,
				objectsUsed: _.keys(entityos._cloud.object).length,
				journal: entityos._cloud.log,
				isNextRelease: cloudIsNextRelease
			},
            space: entityos._scope.space
		},
		user: entityos._scope.user,
		authenticated: (entityos._scope.user != undefined),
        view:
        {
            uri: entityos._scope.app.uri,
            uriContext: entityos._scope.app.uriContext,
            dataContext: entityos._scope.app.dataContext,
            site: entityos._scope.app.site
        }
	}

	whoamiData.thisInstanceOfMe.functionality.access = 
	{
		methods: _.keyBy(entityos._cloud.log, '_method')
	}

	if (_.has(app, 'data'))
	{
		whoamiData.thisInstanceOfMe.data = entityos._scope.data
	}

	var userRoleTitle = 'Template';

	if (entityos._scope.user.roles.rows.length > 0)
	{
		whoamiData.thisInstanceOfMe.userRole = _.first(entityos._scope.user.roles.rows)['title'].toLowerCase();
		whoamiData.thisInstanceOfMe._userRole = _.kebabCase(_.first(entityos._scope.user.roles.rows)['title'].toLowerCase());
		userRoleTitle = _.first(entityos._scope.user.roles.rows)['title'] + ' Template';
	}

	var asUserRoleMethods = _.map(whoamiData.thisInstanceOfMe.functionality.access.methods, function (methodData, methodName)
	{
		var methodAccess = 
		{
			title: methodName.toUpperCase(),
			canuse: '',
			canadd: '',
			canupdate: '',
			canremove: '',
			guidmandatory: 'N'
		}

		if (_.contains(methodName, '_search'))
		{
			methodAccess.canuse = 'Y';
			methodAccess.canadd = 'N';
			methodAccess.canupdate = 'N';
			methodAccess.canremove = 'N';
		}
		else
		{
			methodAccess.canuse = 'N';
			methodAccess.canadd = 'Y';
			methodAccess.canupdate = 'Y';
			methodAccess.canremove = 'Y';
		}

		return methodAccess
	})

	whoamiData.thisInstanceOfMe.functionality.access.asUserRole = 
	{
		template:
		{
			roles:
			[
				{
					title: userRoleTitle,
					methods: _.sortBy(asUserRoleMethods, 'title'),
					properties: []
				}
			]
		}
	}

	whoamiData.thisInstanceOfMe.functionality.access._asUserRole = JSON.stringify(whoamiData.thisInstanceOfMe.functionality.access.asUserRole)
	
	if (whoamiData.thisInstanceOfMe.authenticated)
	{
		whoamiData.thisInstanceOfMe.userRoles = entityos._scope.user.roles.rows;
		whoamiData.thisInstanceOfMe.space = entityos._scope.user.space;
		whoamiData.thisInstanceOfMe.spaceName = entityos._scope.user.spacename;
	}

	if (app != undefined)
	{
		whoamiData.thisInstanceOfMe.storage.local = 
		{
			scopes: _.keys(entityos._scope.data),
			count: _.keys(entityos._scope.data).length,
			_storage: entityos._scope.data
		}
	}

	whoamiData.thisInstanceOfMe.functionality.mostUsed = 
		_.reverse(_.sortBy(_.filter(entityos._util.controller.data.whoami, function (whoami)
		{
			return (whoami.invoked != 0)
		}), function (whoamiSort)
		{
			return whoamiSort.invoked
		}));

	whoamiData.thisInstanceOfMe.storage.cloud.mostUsed = 
		_.reverse(_.sortBy(_.filter(entityos._cloud.object, function (object)
		{
			return (object.count != 0)
		}), function (objectSort)
		{
			return objectSort.count
		}));

	return whoamiData
}

entityos._util.controller.add(
[
	{
		name: 'util-controller-add',
		code: function (param)
		{
			entityos._util.controller.add(param);
		}
	},
	{
		name: 'util-controller-invoke',
		code: function (param)
		{
			entityos._util.controller.invoke(param);
		}
	}
]);

entityos._util.healthCheck =
{
	data: {},
	
	run: function (param)
	{
		var scope = entityos._util.param.get(param, 'scope', {default: 'views'}).value;
		var strategy = entityos._util.param.get(param, 'strategy', {default: 'analyse'}).value; //
		var mode = entityos._util.param.get(param, 'mode', {default: 'automated'}).value;
		var selector = entityos._util.param.get(param, 'selector').value;
		var onlyIfEmpty = entityos._util.param.get(param, 'onlyIfEmpty', {default: false}).value;
		var elements;
		var runData = {input: param}
		var elementData;
		var checkParent = entityos._util.param.get(param, 'checkParent', {default: false}).value;

		if (selector == undefined)
		{
			selector = '.entityos-view, .myds-view'
			if (scope == 'view-templates') {selector = '.entityos-view-template, .myds-view-template'}
		}
	
		if (checkParent)
		{
			elements = $(selector).parent();
		}
		else
		{
			elements = $(selector);
		}

		if (strategy == 'eleminination')
		{
			if (mode == 'automated')
			{
				if (onlyIfEmpty)
				{
					_.each(elements, function (element)
					{
						if ($(element).children().length == 0)
						{
							$(element).remove()
						}
					});
				}
				else
				{
					elements.remove();
				}
			}
			else
			{
				var _continue = true;

				_.each(elements, function (element)
				{
					if (_continue)
					{
						$(element).remove()
						_continue = confirm('Just elemininated ' + element.id + ', continue?');
					}
				});
			}
		}
		else
		{
			var elementDataLog = {};
			var elementData = {};
			var elementIssues = {};
			var elementID;
			var currentParent;

			_.each(['div', 'ul', 'li', 'form', 'textarea'], function (type)
			{
				elementData[type] = {};
				elementIssues[type] = {};
				elementDataLog[type] = [];

				_.each(elements, function (element, e)
				{
					elementID = element.id;
					if (_.isEmpty(elementID))
					{
						elementID = '_' + e 
					}

					elementData[type][elementID] =
					{
						_open: _.split($(element).html(), '<' + type),
						open: _.split($(element).html(), '<' + type).length - 1,
						_close: _.split($(element).html(), '</' + type),
						close: _.split($(element).html(), '</' + type).length - 1,
						parent: $(element).parent().attr('id'),
						_parent: $(element).parent()
					}

					elementData[type][elementID]['difference'] = (
						elementData[type][elementID]['open'] - 
						elementData[type][elementID]['close']);

					elementData[type][elementID]['source'] = $(element).html();

					_.each(elementData[type][elementID]._open, function (openElement)
					{
						if (scope == 'views')
						{
							if (_.includes(openElement, 'entityos-view') || _.includes(openElement, 'myds-view'))
							{
								elementData[type][elementID].missingClose = true;
							}
						}

						if (scope == 'view-templates')
						{
							if (_.includes(openElement, 'entityos-view-template') || _.includes(openElement, 'myds-view-template'))
							{
								elementData[type][elementID].missingClose = true;
							}
						}
					});

					if (currentParent != $(element).parent().attr('id') && currentParent != undefined)
					{
						elementData[type][elementID]['parentChanged'] = true;
						elementData[type][elementID]['_parentChanged'] =
						{
							from: currentParent,
							to: $(element).parent().attr('id'),
							suspect: _.last(elementDataLog[type])
						}
					}

					currentParent = $(element).parent().attr('id')

					elementData[type][elementID]['issue'] =
					(
						elementData[type][elementID]['difference'] != 0
						|| elementData[type][elementID]['missingClose']
						|| elementData[type][elementID]['parentChanged']
					);

					elementDataLog[type].push(_.assign(
					{
						id: elementID,
						missingClose: elementData[type][elementID]['missingClose'],
						parentChanged: elementData[type][elementID]['parentChanged']
					},
					elementData[type][elementID]));

				});

				elementIssues[type] = _.filter(elementDataLog[type], function (data)
				{
					return data['issue']
				});
			});
		}

		//ANALYSIS
		var resultNotes = [];
		var resultData = []

		_.each(['div'], function (type)
		{
			_.each(elementIssues['div'], function (issue)
			{
				if (issue.parentChanged)
				{
					resultNotes.push(issue.id + ' parent is not as expected; suspect there is an issue with ' + type + ' elements in ' + issue._parentChanged.suspect.id);
					resultData.push($('#' + issue._parentChanged.suspect.id));
				}

				if (issue.missingClose)
				{
					resultNotes.push(issue.id + ' is missing closing ' + type + ' tag.');
					resultData.push($('#' + issue.id))
				}
			});
		});

		runData.data =
		{
			elements: elements,
			data: elementData,
			log: elementDataLog,
			issues: elementIssues
		}

		runData.result = 
		{
			notes: resultNotes,
			data: resultData
		}

		entityos._util.healthCheck.data.run = runData;

		return runData;
	}
}

entityos._util.access =
{
	has: function (param)
	{
		var roles = entityos._util.param.get(param, 'roles').value;
		var access = entityos._util.param.get(param, 'access', {"default": false}).value;

		if (roles != undefined)
		{	
			access = false;

			$.each(roles, function (r, role)
			{
				if (!access)
				{	
					if (role.title != undefined)
					{
						access = entityos._util.user.roles.has({roleTitle: role.title, exact: false})
					}
					else
					{
						access = entityos._util.user.roles.has({role: role.id})
					}
				}	
			});
		}
		
		return access;	
	},

	show: function (param)
	{
		var roles = entityos._util.param.get(param, 'roles').value;
		var access = entityos._util.param.get(param, 'access', {"default": false}).value;
		var selector = entityos._util.param.get(param, 'selector', {"default": false}).value;

		if (roles != undefined)
		{	
			access = false;

			$.each(roles, function (r, role)
			{
				if (!access)
				{	
					if (role.title != undefined)
					{
						access = entityos._util.user.roles.has({roleTitle: role.title, exact: false})
					}
					else
					{
						access = entityos._util.user.roles.has({role: role.id})
					}
				}	
			});

			$(selector)[(access?'remove':'add') + 'Class']('hidden d-none');
		}
		
		return access;	
	},

	hide: function (param)
	{
		var roles = entityos._util.param.get(param, 'roles').value;
		var access = entityos._util.param.get(param, 'access', {"default": false}).value;
		var selector = entityos._util.param.get(param, 'selector', {"default": false}).value;

		if (roles != undefined)
		{	
			access = true;

			$.each(roles, function (r, role)
			{
				if (access)
				{	
					if (role.title != undefined)
					{
						access = !entityos._util.user.roles.has({roleTitle: role.title, exact: false})
					}
					else
					{
						access = !entityos._util.user.roles.has({role: role.id})
					}
				}	
			});

			$(selector)[(access?'remove':'add') + 'Class']('hidden d-none');
		}
		
		return access;	
	}
}

entityos._util.controller.add(
[
	{
		name: 'util-security-access-check',
		code: function (param)
		{
			if (_.isString(param))
			{
				param = {roles: [{title: param}]};
			}

			return entityos._util.access.has(param);
		}
	},
	{
		name: 'util-security-access-view-show',
		code: function (param)
		{
			entityos._util.access.show(param);
		}
	},
	{
		name: 'util-security-access-view-hide',
		code: function (param)
		{
			entityos._util.access.hide(param);
		}
	}
]);

entityos._util.data = 
{
	reset: function (param)
			{
				var controller = entityos._util.param.get(param, 'controller').value;
				var scope = entityos._util.param.get(param, 'scope').value;
				
				if (controller != undefined)
				{
					entityos._scope.data[controller] = {}
				}
				
				if (scope != undefined)
				{
					entityos._scope.data[scope] = {}
				}
			},
	
	clear: 	function (param)
			{
				var controller = entityos._util.param.get(param, 'controller').value;
				var scope = entityos._util.param.get(param, 'scope').value;
				var context = entityos._util.param.get(param, 'context').value;
				var name = entityos._util.param.get(param, 'name').value;
				var value = entityos._util.param.get(param, 'value').value;

				if (controller == undefined)
				{
					controller = scope;
				}

				if (controller != undefined)
				{
					if (context != undefined)
					{
						if (name != undefined)
						{
							if (entityos._scope.data[controller] != undefined)
							{
								if (entityos._scope.data[controller][context] != undefined)
								{
									delete entityos._scope.data[controller][context][name];
								}
							}
						}
						else 
						{
							if (entityos._scope.data[controller] != undefined)
							{
								delete entityos._scope.data[controller][context];
							}
						}	
					}
					else
					{
						if (name != undefined)
						{
							if (entityos._scope.data[controller] != undefined)
							{
								delete entityos._scope.data[controller][name];
							}
						}
						else
						{
							delete entityos._scope.data[controller];
						}
					}	
				}
			},

	set: 	function (param)
			{
				var controller = entityos._util.param.get(param, 'controller').value;
				var scope = entityos._util.param.get(param, 'scope').value;
				var context = entityos._util.param.get(param, 'context').value;
				var name = entityos._util.param.get(param, 'name').value;
				var value = entityos._util.param.get(param, 'value').value;
                var valueAsIs = mydigitalstructure._util.param.get(param, 'valueAsIs', {default: false}).value;
				var merge = entityos._util.param.get(param, 'merge', {default: false}).value;
				var data;

				if (controller == undefined)
				{
					controller = scope;
				}
				
				if (controller != undefined)
				{
                    if (!_.has(entityos._scope, 'data'))
                    {
                        entityos._scope.data = {}
                    }

                    if (window.app == undefined)
                    {
                        window.app = {data: entityos._scope.data};
                    }

                     if (!_.has(window.app, 'data'))
                    {
                        window.app.data = entityos._scope.data;
                    }

					//if (_.isUndefined(app.data)) {app.data = {}}
						
					if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}

					if (context != undefined)
					{
						if (entityos._scope.data[controller][context] == undefined) {entityos._scope.data[controller][context] = {}}
					}

					if (context != undefined)
					{
						if (name != undefined)
						{
                            if (_.isFunction(value) && !valueAsIs)
                            {
                                value = value(entityos._scope.data[controller][context][name])
                            }

							if (merge && _.isObject(value) && _.isObject(entityos._scope.data[controller][context][name]))
							{
								entityos._scope.data[controller][context][name] = _.assign(entityos._scope.data[controller][context][name], value);
							}
							else
							{
								entityos._scope.data[controller][context][name] = value;
							}

							data = entityos._scope.data[controller][context][name];
						}
						else 
						{
                            if (_.isFunction(value) && !valueAsIs)
                            {
                                value = value(entityos._scope.data[controller][context])
                            }

							if (merge && _.isObject(value) && _.isObject(entityos._scope.data[controller][context]))
							{
								entityos._scope.data[controller][context] = _.assign(entityos._scope.data[controller][context], value);
							}
							else
							{
								entityos._scope.data[controller][context] = value;
							}

							data = entityos._scope.data[controller][context];
						}	
					}
					else
					{
						if (name != undefined)
						{
                            if (_.isFunction(value) && !valueAsIs)
                            {
                                value = value(entityos._scope.data[controller][name])
                            }

							if (merge && _.isObject(value) && _.isObject(entityos._scope.data[controller][name]))
							{
								entityos._scope.data[controller][name] = _.assign(entityos._scope.data[controller][name], value);
							}
							else
							{
								entityos._scope.data[controller][name] = value;
							}

							data = entityos._scope.data[controller][name]
						}
						else
						{
                            if (_.isFunction(value) && !valueAsIs)
                            {
                                value = value(entityos._scope.data[controller])
                            }

							if (merge && _.isObject(value) && _.isObject(entityos._scope.data[controller]))
							{
								entityos._scope.data[controller] = _.assign(entityos._scope.data[controller], value);
							}
							else
							{
								entityos._scope.data[controller] = value;
							}

							data = entityos._scope.data[controller];
						}	
					}
				}
				
				return data
			},

	get: 	function (param)
			{
				var controller = entityos._util.param.get(param, 'controller').value;
				var scope = entityos._util.param.get(param, 'scope').value;
				var context = entityos._util.param.get(param, 'context').value;
				var name = entityos._util.param.get(param, 'name').value;
				var id = entityos._util.param.get(param, 'id').value;
				var valueDefault = entityos._util.param.get(param, 'valueDefault').value;
				var value;
				var clean = entityos._util.param.get(param, 'clean', {"default": false}).value;
				var clone = entityos._util.param.get(param, 'clone', {"default": false}).value;
				var keyBy = entityos._util.param.get(param, 'keyBy').value;
				var cleanForCloudStorage = entityos._util.param.get(param, 'cleanForCloudStorage').value;
				var deepClean = entityos._util.param.get(param, 'deepClean', {"default": false}).value;
				var merge = entityos._util.param.get(param, 'merge').value;
				var mergeDefault = entityos._util.param.get(param, 'mergeDefault').value;

				if (cleanForCloudStorage == undefined)
				{
					cleanForCloudStorage = deepClean
				}

				if (cleanForCloudStorage)
				{
					clone = true;
				} 

				if (controller == undefined)
				{
					controller = scope;
				}

				if (controller != undefined)
				{
					if (_.isUndefined(entityos._scope.data)) {entityos._scope.data = {}}
						
					if (entityos._scope.data[controller] != undefined)
					{
						if (context != undefined)
						{
							if (entityos._scope.data[controller][context] != undefined)
							{	
								if (name != undefined)
								{
									value = entityos._scope.data[controller][context][name];
								}
								else 
								{
									value = entityos._scope.data[controller][context];
								}
							}
						}
						else
						{
							if (name != undefined)
							{
								value = entityos._scope.data[controller][name];
							}
							else
							{
								value = entityos._scope.data[controller];
							}
						}
					}	
				}

				if (value != undefined && id != undefined)
				{
					value = $.grep(value, function (v) {return v.id == id})[0];
				}

				value = (clone?_.clone(value):value);
				
				if (value == undefined && valueDefault != undefined)
				{
					value = valueDefault;
					param.value = value;
					entityos._util.data.set(param);
				}

				if (_.isObject(mergeDefault))
				{
					if (mergeDefault.id != '' && mergeDefault.id != undefined)
					{
						value = _.assign(value, {id: mergeDefault.id})
					}
					else if (_.isObject(mergeDefault.values))
					{
						value = _.assign(mergeDefault.values, value)
					}
				}

				if (_.isObject(merge))
				{
					if (merge.passive)
					{
						value = _.assign(merge.values, value)
					}
					else
					{
						value = _.assign(value, merge.values)
					}
				}

				if (_.isObject(value) && (clean || cleanForCloudStorage))
				{
					value = _.pickBy(value, function (valueValue, key)
					{
						var include = true;

						if (_.startsWith(key, '_'))
						{
							if (value[key.substr(1)] != undefined)
							{
								include = false;
							}
						}

						if (cleanForCloudStorage)
						{
							if (key == 'validate' && _.isObject(value[key]))
							{
								include = false
							}

							if (	key == 'scope'
									|| key == 'context'
									|| key == 'name'
									|| key == 'target'
									|| key == 'value'
									|| key == '_param'
									|| key == 'dataContext'
									|| key == 'viewStatus'
									|| _.startsWith(key, 'validate'))
							{
								include = false
							}

							if (include)
							{
								if (_.includes(key, '-unselected'))
								{
									include = false
								}
							}
						}

						return include
					})
				}

				var valueReturn = (clone?_.clone(value):value);

				if (keyBy != undefined)
				{
					valueReturn = _.keyBy(valueReturn, keyBy);
				}

				return valueReturn
			},

	find: function (param)
			{
				var controller = entityos._util.param.get(param, 'controller').value;
				var scope = entityos._util.param.get(param, 'scope').value;
				var context = entityos._util.param.get(param, 'context', {'default': 'id'}).value;
				var setContext = entityos._util.param.get(param, 'setContext', {'default': 'dataContext'}).value;  
				
				var dataController = entityos._util.param.get(param, 'dataController').value;
				var dataScope = entityos._util.param.get(param, 'dataScope', {'default': 'setup'}).value;
				var dataContext = entityos._util.param.get(param, 'dataContext', {'default': 'all'}).value;
				var dataName = entityos._util.param.get(param, 'dataName', {'default': 'id'}).value;

				if (dataController == undefined) {dataController = dataScope}

				if (controller == undefined) {controller = scope}

				if (dataContext == undefined && dataController == 'setup')
				{
					dataContext = context;
				}
					
				var name = entityos._util.param.get(param, 'name').value;
				var id = entityos._util.param.get(param, 'id').value;
				var returnValue = entityos._util.param.get(param, 'valueDefault').value;
				
				if (context != undefined)
				{
					if (id == undefined && controller != undefined)
					{
						id = entityos._util.data.get(
						{
							controller: controller,
							context: context
						});
					}
					
					var data = entityos._util.data.get(
					{
						controller: dataController,
						context: dataContext
					});
					
					if (data != undefined && _.isSet(id))
					{
						var _id = id;
							
						if (!_.isArray(_id))
						{	
							_id = _.split(id, ',');
						}
						
						if  (_.size(_id) == 1)
						{
							//var value = _.find(data, function (d) {return d.id == _id[0]})
							var value = _.find(data, function (d) {return d[dataName] == _id[0]})

							if (name != undefined && value != undefined)
							{
								returnValue = value[name];
							}
							else
							{
								returnValue = value;
							}
						}
						else
						{
							var _values = [];
							var _value;
							
							_.each(_id, function (id)
							{
								_value = _.find(data, function (d) {return d[dataName] == id})

								if (name != undefined && _value != undefined)
								{
									_values.push(_value[name]);
								}
							})
							
							returnValue = _.join(_values, ', ');
						}

						if (!_.isEmpty(setContext))
						{
							entityos._util.data.set(
							{
								controller: controller,
								context: setContext,
								value: returnValue
							})
						}
					}
				}
				
				return returnValue;
			}		
}

entityos._util.controller.add(
[
	{
		name: 'util-data-clear',
		code: function (param)
		{
			entityos._util.data.clear(param);
		}
	},
	{
		name: 'util-data-find',
		code: function (param)
		{
			entityos._util.data.find(param);
		}
	},
	{
		name: 'util-data-get',
		code: function (param)
		{
			entityos._util.data.get(param);
		}
	},
	{
		name: 'util-data-reset',
		code: function (param)
		{
			entityos._util.data.reset(param);
		}
	},
	{
		name: 'util-data-set',
		code: function (param)
		{
			entityos._util.data.set(param);
		}
	}
]);

entityos._util.reset = function (param)
{
	var controller = entityos._util.param.get(param, 'controller').value;
	var scope = entityos._util.param.get(param, 'scope').value;
	var data = entityos._util.param.get(param, 'data').value;
	var includeNew = entityos._util.param.get(param, 'includeNew', {default: true}).value;

	if (controller == undefined) {controller = scope}

	if (data)
	{
		entityos._util.data.reset(param);

		if (includeNew)
		{
			entityos._util.data.reset({scope: scope + '-'});
		}
	}
	
	$('#' + controller + ' .entityos-text').val('');
	$('#' + controller + ' .entityos-check').attr('checked', false);
	$('#' + controller + ' .entityos-data').html('...');
	$('#' + controller + ' .entityos-data-view').html(app.options.working);
	$('#' + controller + ' .entityos-text-select').val('');
	$('#' + controller + ' .entityos-text-select').removeAttr('data-id');
	$('#' + controller + ' input').removeClass('entityos-validate-error');

    $('#' + controller + ' .myds-text').val('');
	$('#' + controller + ' .myds-check').attr('checked', false);
	$('#' + controller + ' .myds-data').html('...');
	$('#' + controller + ' .myds-data-view').html(entityos._scope.app.options.working);
	$('#' + controller + ' .myds-text-select').val('');
	$('#' + controller + ' .myds-text-select').removeAttr('data-id');
	$('#' + controller + ' input').removeClass('myds-validate-error');
}

entityos._util.controller.add(
{
	name: 'util-view-reset',
	code: function (param)
	{
		entityos._util.reset(param);
	}
});

entityos._util.data.clean = function (data)
{
	var dataReturn = {}

	if (_.isObject(data))
	{
		_.each(data, function (value, key)
		{
			dataReturn[key] = entityos._util.data._clean(value)
		});
	}
	else
	{
		dataReturn = entityos._util.data._clean(data)
	}

	return dataReturn;
};

entityos._util.data._clean = function (jsonString)
{
	try
	{
		if (_.includes(jsonString, 'base64:'))
		{
			jsonString = atob(jsonString.replace('base64:', ''))
		}

		var o = JSON.parse(jsonString);

		if (o && typeof o === "object")
		{
			return o;
		}
	}
	catch (e)
	{}

	return jsonString;
}

entityos._util.controller.add(
{
	name: 'util-data-clean',
	code: function (param)
	{
		return entityos._util.data.clean(param);
	}
});

entityos._util.clean = function (data)
{
	var dataReturn = {}

	if (_.isObject(data))
	{
		_.each(data, function (value, key)
		{
			dataReturn[key] = entityos._util._clean(value)
		});
	}
	else
	{
		dataReturn = entityos._util._clean(data)
	}

	return dataReturn;
};

entityos._util._clean = function(param)
{
	var val;
	var returnVal;
	var strip = entityos._scope.app.options.xssStrip;
	var encode = entityos._scope.app.options.xssEncode;

	if (param != null)
	{
		if (typeof param == 'object')
		{
			val = param.val;
		}
		else
		{
			val = param;
		}

		if (val != undefined)
		{
			if (typeof filterXSS == 'function')
			{
				returnVal = filterXSS(val, {stripIgnoreTag: entityos._scope.app.options.xssStrip})
			}
			else if (_.isObject(window.he))
			{
				if (encode)
				{
					returnVal = he.encode(val);
				}
				else
				{
					returnVal = he.escape(val);
				}
			}
			else
			{
				returnVal = encodeURIComponent(val);
			}

			val = String(val).replace(/[\u0099-\u2666]/g, function(c)
  			{
				return '&#' + c.charCodeAt(0) + ';';
			});
		}
	}
	else
	{
		returnVal = ''
	}

	return returnVal;
}

entityos._util.controller.add(
{
	name: 'util-data-text-clean',
	code: function (param)
	{
		return entityos._util.clean(param);
	}
});

entityos._util.decode = function (data)
{
	var dataReturn = {}

	if (_.isPlainObject(data))
	{
		_.each(data, function (value, key)
		{
			dataReturn[key] = entityos._util._decode(value)
		});
	}
	else
	{
		dataReturn = entityos._util._decode(data)
	}

	return dataReturn;
};

entityos._util._decode = function(value)
{
    var dataReturn = '';

	if (_.isUndefined(value)) {value = ''};

    value = _.toString(value);

    if (_.isObject(window.he))
    {
        dataReturn = he.decode(value);
    }
    else if (_.isFunction(_.unescapeHTML))
    {
        dataReturn = _.unescapeHTML(value);
    }
    else
    {
        dataReturn = _.unescape(value);
    }

    return dataReturn;
}

entityos._util.controller.add(
{
    name: 'util-decode',
    code: function (param)
    {
        return entityos._util.decode(param);
    }
});

entityos._util.menu =
{
	set: function (param)
	{
		var element = entityos._util.param.get(param, 'element').value;
		var selector = entityos._util.param.get(param, 'selector').value;
		var href = entityos._util.param.get(param, 'href').value;
		var scope = entityos._util.param.get(param, 'scope').value;
		var uri = entityos._util.param.get(param, 'uri').value;
		var uriContext = entityos._util.param.get(param, 'uriContext').value;
		var active = entityos._util.param.get(param, 'active', {default: true}).value;

		if (element == undefined)
		{
			if (uri == undefined)
			{
				uri = entityos._scope.app.options.startURI
			}

			if (selector == undefined)
			{
				if (href != undefined)
				{
					selector = '.entityos-menu [href="' + href + '"], .myds-menu [href="' + href + '"]' 
				}
				else if (scope != undefined)
				{
					selector = '.entityos-menu [href="' + uri + '/#' + scope + '"], .myds-menu [href="' + uri + '/#' + scope + '"]' 
				}
				else if (uriContext != undefined)
				{
					selector = '.entityos-menu [href="' + uri + '/' + uriContext + '"], .myds-menu [href="' + uri + '/' + uriContext + '"]' 

					var _uriContext = _.split(uriContext, '-');

					if (_uriContext.length > 2)
					{
						selector = selector + ', .entityos-menu [href="' + uri + '/' + _uriContext[0] + '-' + _uriContext[1] + 's"], .myds-menu [href="' + uri + '/' + _uriContext[0] + '-' + _uriContext[1] + 's"]'
					}
				}
			}

			if (selector != undefined)
			{
				element = $(selector);
			}
		}

		if ($('.metismenu').length != 0 && element.length != 0 )
		{
			$('.metismenu').find('li').not(element.parents('li')).removeClass('active');

			if (element.attr('href') != '#')
			{
				if ($(element).parents('ul.nav-second-level').length == 0)
				{
					element.parent().addClass('active');
					element.parent().siblings().find('ul').removeClass('in');
				}
				else
				{
					_.each(['second', 'third'], function(numberLevel)
					{
						var parentElement = $(element).parents('ul.nav-' + numberLevel + '-level');
						if (!parentElement.parent().hasClass('active'))
						{
							parentElement.parent().addClass('active');
						}

						if (!parentElement.hasClass('in'))
						{
							parentElement.addClass('in');
						}
						
						element.parent().addClass('active');
						parentElement.parent().siblings().find('ul').removeClass('in');
					});
				}
			}
		}
		else if (element.length != 0 )
		{
            $('.entityos-menu, .myds-menu').find('li').removeClass('active');

			if (element.attr('href') != '#')
			{
				element.parent().addClass('active');

				if ($(element).parents('div.entityos-menu-group, div.myds-menu-group').length == 0)
				{
					element.parent().siblings().find('div.entityos-menu-group, div.myds-menu-group').removeClass('show');
				}
				else
				{
					element.parents('div.entityos-menu-group, div.myds-menu-group').addClass('show');
				}
			}
		}
	}
}

entityos._util.uuid = function (param)
{
	var pattern = entityos._util.param.get(param, 'pattern', {"default": 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'}).value;
	var d = new Date().getTime();
	var uuid = pattern.replace(/[xy]/g, function(c)
	{
		var r = (d + Math.random()*16)%16 | 0;
		d = Math.floor(d/16);
		return (c=='x' ? r : (r&0x7|0x8)).toString(16);
	});

	return uuid;
}

entityos._util.versionCheck = function (oldVer, newVer)
{
	const oldParts = oldVer.split('.')
	const newParts = newVer.split('.')

	for (var i = 0; i < newParts.length; i++)
	{
		const a = parseInt(newParts[i]) || 0
		const b = parseInt(oldParts[i]) || 0
		if (a > b) return true
		if (a < b) return false
	}

	return false
}

entityos._util.controller.add(
{
	name: 'util-uuid',
	code: function (param)
	{
		return entityos._util.uuid(param);
	}
});

entityos._util.view.text = 
{
	getWidth: function (param)
	{
		var text = entityos._util.param.get(param, 'text').value;
		var font = entityos._util.param.get(param, 'font', {default: {size: '16', unit: 'px', family: 'times new roman'}}).value;
		var calcUsing = entityos._util.param.get(param, 'calcUsing', {default: 'css'}).value;
		var width;
		var formattedWidth;
		var unit = 'px';

		if (calcUsing.toLowerCase() == 'canvas')
		{
			var canvas = document.createElement("canvas"); 
			var context = canvas.getContext("2d"); 
			context.font = font.size + font.unit + ' ' + font.family; 
			width = context.measureText(text).width; 
	   }
	   else
	   {
			var span = document.createElement("span"); 
			document.body.appendChild(span); 

			span.style.font = font.family; 
			span.style.fontSize = font.size + font.unit; 
			span.style.height = 'auto'; 
			span.style.width = 'auto'; 
			span.style.position = 'absolute'; 
			span.style.whiteSpace = 'no-wrap'; 
			span.innerHTML = text; 
			width = Math.ceil(span.clientWidth); 
			document.body.removeChild(span); 
	   }

     	return {width: width, unit: unit}
	},

	getFontSize: function (param)
	{
		var width = entityos._util.param.get(param, 'width').value;
		var _text = entityos._util.view.text.getWidth(param);
		var font = entityos._util.param.get(param, 'font', {default: {}}).value;
		if (font.unit == undefined) {font.unit = 'px'}
		var ratio;
		var newFont = _.clone(font);
		var minimum = entityos._util.param.get(param, 'minimum').value;
		var maximum = entityos._util.param.get(param, 'maximum').value;
		var scale = entityos._util.param.get(param, 'scale', {default: 0.95}).value;
		scale = numeral(scale).value();

		if (_text.width != undefined || _text.width != 0)
		{
			ratio = numeral(width).value() / numeral(_text.width).value();
			newFont._size = numeral(newFont.size).value() * ratio;
			newFont.size = newFont._size * scale;

			if (newFont._size > maximum) {newFont.size = maximum}
			if (newFont._size < minimum) {newFont.size = minimum}

			newFont.size = numeral(newFont.size).format('0');
		}

		return {font: newFont, orginalFont: font, ratio: numeral(ratio).format('0.0000'), text: _text}
	},

	setFontSize: function (param)
	{
		var selector = entityos._util.param.get(param, 'selector').value;

		if (selector != undefined)
		{
			if ($(selector).length != 0)
			{
				var text = entityos._util.param.get(param, 'text').value;
				if (text == undefined)
				{
					text = $(selector).text();
					param = entityos._util.param.set(param, 'text', text);
				}
				
				var width = entityos._util.param.get(param, 'width').value;
				if (width == undefined)
				{
					width = $(selector).width();
					param = entityos._util.param.set(param, 'width', width);
				}
				
				var font = entityos._util.param.get(param, 'font').value;

				if (font == undefined)
				{
					font = 
					{
						size: $(selector).css('font-size').replace('px', ''),
						unit: 'px',
						family: $(selector).css('font-family')
					}
					entityos._util.param.set(param, 'font', font);
				}
			}
			
			var getFontSize = entityos._util.view.text.getFontSize(param);
			var newFont = getFontSize.font;

			$(selector).css('font-size', newFont.size + newFont.unit)
		}
		
		return {font: newFont, orginalFont: font, ratio: getFontSize.ratio, text: getFontSize.text, width: width}
	}
}

entityos._util.controller.add(
[
	{
		name: 'util-view-text-get-width',
		code: function (param)
		{
			return entityos._util.view.text.getWidth(param);
		}
	},
	{
		name: 'util-view-text-get-font-size',
		code: function (param)
		{
			return entityos._util.view.text.getFontSize(param);
		}
	},
	{
		name: 'util-view-text-set-font-size',
		code: function (param)
		{
			return entityos._util.view.text.setFontSize(param);
		}
	}
]);

entityos._util.view.spinner = 
{
	data: {html: {}, selector: {}, element: {}},

	add: function (param)
	{
		var element = entityos._util.param.get(param, 'element').value;
		var selector = entityos._util.param.get(param, 'selector').value;
		var controller = entityos._util.param.get(param, 'controller').value;
		var uuid = entityos._util.uuid();
		var mode = entityos._util.param.get(param, 'mode', {default: 'html'}).value;
		var disable = entityos._util.param.get(param, 'disable', {default: true}).value;
		var text = entityos._util.param.get(param, 'text').value;

		if (element == undefined)
		{
			if (selector == undefined && controller != undefined)
			{
				element = $('[data-controller="' + controller + '"]')
			}
			else
			{
				element = $(selector)
			}
		}

		if (element != undefined)
		{
			var margin = '';
			if (mode == 'prepend') {margin = 'mr-1'}
			if (mode == 'append') {margin = 'ml-1'}

			var html = '<span class="spinner-border spinner-border-sm entityos-spinner myds-spinner' + margin + '" role="status" aria-hidden="true"></span>';

			if (text == undefined)
			{
				html = html + '<span class="sr-only">Loading...</span>'
			}
			else
			{
				html = html + '<span class="entityos-spinner myds-spinner">' + text + '</span>'
			}

			if (controller != undefined) {uuid = controller}

			if (mode == 'html')
			{
				entityos._util.view.spinner.data.html[uuid] = $(element).html();
			}

			entityos._util.view.spinner.data.selector[uuid] = selector;
			entityos._util.view.spinner.data.element[uuid] = element;

			$(element)[mode](html)

			if (disable)
			{
				$(element).addClass('disabled');
			}

			$(element).data('entityos-spinner-uuid', uuid);
            $(element).data('myds-spinner-uuid', uuid)
		}
	},

	removeAll: function (param)
	{
		var elements = $('.entityos-spinner, .myds-spinner, [data-spinner]');

		_.each(elements, function (element)
		{
			entityos._util.view.spinner.remove({element: element});
		});
	},

	remove: function (param)
	{
		var element = entityos._util.param.get(param, 'element').value;
		var selector = entityos._util.param.get(param, 'selector').value;
		var controller = entityos._util.param.get(param, 'controller').value;
		var enable = entityos._util.param.get(param, 'enable', {default: true}).value;
		
		if (element == undefined)
		{
			if (controller != undefined)
			{
				element = entityos._util.view.spinner.data.element[controller];
			}

			if (element == undefined)
			{
				if (selector == undefined && controller != undefined)
				{
					selector = entityos._util.view.spinner.data.selector[controller];

					if (selector != undefined)
					{
						element = $(selector);
					}
					else
					{
						element = $('[data-controller="' + controller + '"]');
					}
				}
				else if (selector != undefined)
				{
					element = $(selector)
				}
			}
		}

		if (element != undefined)
		{
			var uuid = $(element).data('entityos-spinner-uuid');
            if (uuid == undefined)
            {
                uuid = $(element).data('myds-spinner-uuid');
            }

			if (uuid != undefined)
			{
				if (controller != undefined) {uuid = controller}
				var html = entityos._util.view.spinner.data.html[uuid];

				if (html != undefined)
				{
					$(element)['html'](html);
				}
				else
				{
					$(element).children('.entityos-spinner').remove();
                    $(element).children('.myds-spinner').remove();
				}

				if (enable)
				{
					$(element).removeClass('disabled');
				}
			}
		}
	}
}

entityos._util.controller.add(
[
    {
        name: 'util-view-spinner-add',
        code: function (param)
        {
            entityos._util.view.spinner.add(param);
        }
    },
    {
        name: 'util-view-spinner-remove',
        code: function (param)
        {
            entityos._util.view.spinner.remove(param);
        }
    },
    {
        name: 'util-view-spinner-remove-all',
        code: function (param)
        {
            entityos._util.view.spinner.removeAll(param);
        }
    }
]);

entityos._util.view.show = function (param)
{
    var context = entityos._util.param.get(param, 'context').value;
    var selector = entityos._util.param.get(param, 'selector').value;
    var collapse = entityos._util.param.get(param, 'collapse', {default: false}).value;

    if (selector == undefined && context != undefined)
    {
        selector = '#' + context;

        if (collapse)
        {
            selector = selector + '-collapse';
        }
    }
    
    if (collapse)
    {
        $(selector).addClass('show');
    }
    else
    {
        $(selector).removeClass('d-none hidden');
    }
}

entityos._util.view.hide =  function (param)
{
    var context = entityos._util.param.get(param, 'context').value;
    var selector = entityos._util.param.get(param, 'selector').value;
    var collapse = entityos._util.param.get(param, 'collapse', {default: false}).value;
    var toast = entityos._util.param.get(param, 'toast', {default: false}).value;

    if (toast)
    {
        $('.toast').toast('hide');
    }
    else
    {
        if (selector == undefined && context != undefined)
        {
            selector = '#' + context;

            if (collapse)
            {
                selector = selector + '-collapse';
            }
        }
        
        if (collapse)
        {
            $(selector).removeClass('show');
        }
        else
        {
            $(selector).addClass('d-none hidden');
        }
    }
}

entityos._util.controller.add(
[
	{
		name: 'util-view-show',
		code: function (param)
		{
			entityos._util.view.show(param);
		}
	},
	{
		name: 'util-view-hide',
		code: function (param)
		{
			entityos._util.view.hide(param);
		}
	},
	{
		name: 'util-view-collapse',
		code: function (param)
		{
            param = _.assign(param, {collapse: true});
			entityos._util.view.hide(param);
		}
	}
]);

entityos._util.validate =
{
	isEmail: function (emailAddress)
	{
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailAddress)
	},

	isDate: function (date)
	{
		var formats = entityos._scope.app.options.dateFormats;
		if (formats == undefined) {formats = ['DD MMM YYYY', 'D MMM YYYY', 'D/MM/YYYY', 'DD/MM/YYYY', 'DD MMM YYYY HH:mm:ss']}
		return moment(date, formats).isValid()
	},

	check: function (param)
	{
		var element = entityos._util.param.get(param, 'element').value;
		var selector = entityos._util.param.get(param, 'selector').value;
		var scope = entityos._util.param.get(param, 'scope').value;
		var context = entityos._util.param.get(param, 'context').value;

		if (element != undefined)
		{
			entityos._util.validate._check(element);
		}
		else
		{
			if (selector == undefined)
			{
				var _selector = [];

				if (scope != undefined)
				{
					_selector.push('[data-scope="' + scope + '"]')
				}

				if (context != undefined)
				{
					_selector.push('[data-context="' + context + '"]')
				}

				if (_selector.length != 0)
				{
					selector = '.entityos-validate' + _.join(_selector, '')
                                    + ', .myds-validate' + _.join(_selector, '');
				}
			}

			if (selector == undefined)
			{
				selector = '.entityos-validate:visible, .myds-validate:visible';
			}

			if (selector != undefined)
			{
				var elements = $(selector);

				_.each(elements, function(element)
				{
					entityos._util.validate._check($(element));
				});
			}
		}
	},

	_check: function (element)
	{
		var errors = [];
		//var element = $(this);
		var elementValue = element.val();
		var controller = element.data('validate-controller');
		var controllerParam = {};

		var scope = element.data('scope');
		if (_.isUndefined(scope)) {scope = controller}
		var context = element.data('context');
		
		if (scope != undefined && context != undefined)
		{
			if (_.isUndefined(entityos._scope.data[scope]))
			{
				entityos._scope.data[scope] = {}
			}

			if (_.isUndefined(entityos._scope.data[scope]['validate']))
			{
				entityos._scope.data[scope]['validate'] = {}
			}

			entityos._scope.data[scope]['validate'][context] = {_id: element.attr('id')}
			entityos._scope.data[scope]['validate'][context]['errors'] = {}

			if (element.attr('data-validate-mandatory') != undefined)
			{
				if (elementValue == '')
				{
					errors.push('mandatory')
					entityos._scope.data[scope]['validate'][context]['errors']['mandatory'] = true
				}
			}

			if (elementValue != '')
			{
				if (element.attr('data-validate-numeral') != undefined)
				{
					if (_.isNull(numeral(elementValue).value()))
					{
						errors.push('numeral')
						entityos._scope.data[scope]['validate'][context]['errors']['numeral'] = true
					}	
				}

				var maximum = element.attr('data-validate-numeral-maximum');

				if (maximum != undefined && !_.isNull(numeral(maximum).value()))
				{
					if (!_.isNull(numeral(elementValue).value()))
					{
						if (numeral(elementValue).value() > numeral(maximum).value())
						{
							errors.push('numeral-maximum')
							entityos._scope.data[scope]['validate'][context]['errors']['numeral-maximum'] = true;
						}
					}	
				}

				var minimum = element.attr('data-validate-numeral-minimum');

				if (minimum != undefined && !_.isNull(numeral(minimum).value()))
				{
					if (!_.isNull(numeral(elementValue).value()))
					{
						if (numeral(elementValue).value() < numeral(minimum).value())
						{
							errors.push('numeral-minimum')
							entityos._scope.data[scope]['validate'][context]['errors']['numeral-minimum'] = true;
						}
					}
				}
				
				var maximumLength = element.attr('data-validate-maximum-length');

				if (maximumLength != undefined)
				{
					if (numeral(elementValue.length).value() > numeral(maximumLength).value())
					{
						errors.push('maximum-length')
						entityos._scope.data[scope]['validate'][context]['errors']['maximum-length'] = true
					}
				}

				var minimumLength = element.attr('data-validate-minimum-length');

				if (minimumLength != undefined)
				{
					if (numeral(elementValue.length).value() < numeral(minimumLength).value())
					{
						errors.push('minimum-length')
						entityos._scope.data[scope]['validate'][context]['errors']['minimum-length'] = true
					}
				}
				
				if (element.attr('data-validate-email') != undefined)
				{
					if (!entityos._util.validate.isEmail(elementValue))
					{
						errors.push('email')
						entityos._scope.data[scope]['validate'][context]['errors']['email'] = true
					}
				}

				if (element.attr('data-validate-date') != undefined)
				{
					if (!entityos._util.validate.isDate(elementValue))
					{
						errors.push('date')
						entityos._scope.data[scope]['validate'][context]['errors']['date'] = true
					}
				}
			}

			entityos._scope.data[scope]['validate'][context]['_errors'] = errors;

			var scopeValidateErrors = false;

			_.each(entityos._scope.data[scope]['validate'], function (value, key)
			{
				if (!scopeValidateErrors && key != 'errors')
				{
					scopeValidateErrors = (value._errors.length != 0);
				}
			});

			entityos._scope.data[scope]['validate']['errors'] = scopeValidateErrors;

			entityos._util.controller.invoke(controller,
			{
				_id: element.attr('id'),
				scope: scope,
				context: context,
				_errors: errors,
				errors: entityos._scope.data[scope]['validate'][context]['errors'],
				scopeErrors: scopeValidateErrors
			});
		}

		var action = (errors.length==0?'remove':'add');

		if ($(element).hasClass('select2-hidden-accessible'))
		{
			element = $(element).siblings('.select2-container').find('.select2-selection').addClass('entityos-validate-error myds-validate-error')
		}

		$(element)[action + 'Class']('entityos-validate-error');
        $(element)[action + 'Class']('myds-validate-error');
	}
}

entityos._util.whenCan =
{
    queue: 		[],
    completed: 	[],
    exists: 	function (param)
    {
        if (param && param.uuid)
        {
            return (_.filter(entityos._util.whenCan.whenCan.queue, function (queue) {queue.uuid == param.uuid}).length > 0)
        }	
        else
        {	
            return (entityos._util.whenCan.queue.length != 0);
        }	
    },

    then: function(param)
    {
        if (_.has(param, 'uuid'))
        {
            return (_.find(entityos._util.whenCan.queue, function (queue) {queue.uuid == param.uuid}))
        }	
    },			

    clear: function(param)
    {
        entityos._util.whenCan.queue.length = 0;
    },

    invoke: function(param)
    {
        var uuid = entityos._util.uuid();

        param.then.uuid = uuid;
        entityos._util.whenCan.queue.unshift(param.then);

        if (param.now)
        {
            var nowParam = _.assign({}, param.now.param);
            nowParam.uuid = uuid;
            param.now.method(nowParam)
        }	
    },
                
    complete: function(returnData, param)
    {
		var onComplete = entityos._util.param.get(param, 'onComplete').value;

        if (entityos._util.whenCan.queue.length > 0)
        {	
            var thenQueue;

            if (param.uuid)
            {
                _.each(entityos._util.whenCan.queue, function (queue, q)
                {
                    if (queue)
                    {	
                        if (queue.uuid == param.uuid)
                        {
                            thenQueue = queue;
                            entityos._util.whenCan.queue.splice(q, 1);
                        }
                    }	
                });
            }	
            else
            {	
                thenQueue = entityos._util.whenCan.queue.shift();
            }

            if (thenQueue)
            {	
                entityos._util.whenCan.completed.unshift(thenQueue);

                if (param == undefined) {param = {}}
                param = _.assign(param, thenQueue.param)
                if (thenQueue.set) {param[thenQueue.set] = returnData};

                returnData = undefined;
                
                var executeMethod = thenQueue.method;
                if (executeMethod != undefined)
                {
                    if (typeof executeMethod != 'string')
                    {
                        executeMethod(param)
                    }	
                }

                var executeController = thenQueue.controller;
                if (executeController != undefined)
                {
                    entityos._util.controller.invoke(executeController, param)	
                }
            }	
        }
		else if (onComplete != undefined)
		{
			entityos._util.onComplete(param)
		}
        
        return returnData;
    }			
}

entityos._util.isNotSet = function (value)
{
	return (value === undefined ||
		value === null ||
		(typeof value === "object" && Object.keys(value).length === 0) ||
		(typeof value === "string" && value.trim().length === 0))
}

	entityos._util.controller.add(
	{
		name: 'util-is-not-set',
		code: function (param, response)
		{
			return entityos._util.isNotSet(value)
		}
	});

entityos._util.isSet = function (value) {return !_.isNotSet(value)}

entityos._util.controller.add(
{
	name: 'util-is-set',
	code: function (param, response)
	{
		return entityos._util.isSet(value)
	}
});

entityos._util.hex.toBuffer = function(base16Text)
{
	return new Uint8Array(base16Text.match(/../g).map(h=>parseInt(h,16))).buffer
}

entityos._util.controller.add(
{
	name: 'util-convert-hex-to-buffer',
	code: function (param)
	{
		return entityos._util.hex.toBuffer (param)
	}
});

entityos._util.hex.CBORtoArray = function(param)
{
	var data = '!! CBOR Not Available [https://github.com/paroga/cbor-js]'

	if (_.isPlainObject(window.CBOR))
	{
		var dataAsBuffer = entityos._util.hex.toBuffer(param);
		data = CBOR.decode(dataAsBuffer);
	}

	return data;
}

entityos._util.controller.add(
{
	name: 'util-convert-hex-to-array',
	code: function (param)
	{
		return entityos._util.hex.CBORtoArray(param)
	}
});

entityos._util.convert.charCodesToText = function(chars)
{
	var arrayChars = chars.split(',');
	var text = String.fromCharCode.apply(null, arrayChars);
	return text;
}

entityos._util.controller.add(
{
	name: 'util-convert-charcodes-to-text',
	code: function (param)
	{
		return entityos._util.convert.charCodesToText(param)
	}
});

entityos._util.factory = {};

entityos._util.factory.core = function (param)
{
	var namespace = entityos._scope.app.options.namespace;
	if (_.isUndefined(namespace)) {namespace = 'app'}
	var _namespace = window[namespace];

	if (entityos._scope.app.options.controller == undefined)
	{
		entityos._scope.app.options.controller = {keep: true}
	}
	else
	{
		if (entityos._scope.app.options.controller.keep == undefined)
		{
			entityos._scope.app.options.controller.keep = true;
		}
	}

	entityos._util.controller.add(
	[
		{
			name: 'app-navigate-to',
			code: function (param)
			{
				var controller = entityos._util.param.get(param, 'controller').value;
				var scope = entityos._util.param.get(param, 'scope').value;
				var target = entityos._util.param.get(param, 'target').value;
				var context = entityos._util.param.get(param, 'context').value;

				if (controller == undefined)
				{
					controller = scope;
				}

				if (_.isUndefined(controller) && !_.isUndefined(target))
				{
					controller = target.replace('#', '')
				}

				if (!_.isUndefined(controller))
				{
					var routerElement = $('.entityos-router, .myds-router');

					if (routerElement.length > 0)
					{
						var element = routerElement.children('.btn');
						if (element.length == 0)
						{
							element = routerElement.children('.dropdown-toggle');
						}

						if (element.length > 0)
						{
							var textElement = element.siblings().find('[data-context="' + controller + '"]')

							if (textElement.length > 0)
							{
								var text = textElement.html();

								var elementText = element.find('span.dropdown-text');

								if (elementText.length != 0)
								{
									elementText.html(text)
								}
								else
								{
									element.html(text + ' <span class="caret"></span>');
								}	
							}
						}
					}

					var param = {}

					if (entityos._scope.app.uriContext != undefined)
					{ 
						param.context = (entityos._scope.app.uriContext).replace('#', '')
					}

					param.dataContext = entityos._util.data.clean($(this).data());
					entityos._scope.data[controller] = entityos._util.data.clean($(this).data());

					var locationHash = '#' + controller;

					if (context != undefined)
					{
						if (entityos._scope.data[controller] != undefined)
						{
							entityos._scope.data[controller]['context'] = context;
						}

						locationHash = locationHash + '/' + context
					}

					window.location.hash = locationHash;
				}	
			}
		},
		{
			name: 'app-router',
			code: function (data)
			{
				if (data)
				{
					var uri = data.uri;
					var uriContext = data.uriContext;

					if (data.isLoggedOn)
					{	
						if (entityos._scope.user.roles.rows.length != 0 )
						{
							var role = entityos._scope.user.roles.rows[0].title.toLowerCase().replaceAll(' ', '-');
							uri = uri.replace('{{role}}', role);
							uriContext = uriContext.replace('{{role}}', role);
						}
					}

					var uriPath = window.location.pathname;
					var uriName = (uriPath).replace(/\//g,'');
					
					if (uri == undefined)
					{	
						uri = '';
					 	if (uriName !='') {uri = '/' + uriName};
					}
					
					if (uriContext == undefined)
					{	
					 	uriContext = window.location.hash;
					}

					if (!data.isLoggedOn && (entityos._scope.app.options.authURIIsHome && uriPath == '/'))
					{
						if (entityos._scope.app.view == undefined) {entityos._scope.app.view = {}}
						if (uri != undefined) {entityos._scope.app.view.uri = uri}
						if (uriContext != undefined) {entityos._scope.app.view.uriContext = uriContext}

						var view = entityos._util.view.get(uri);
						if (view != undefined)
						{	
							entityos._scope.app.view.data = view;
						}			

						entityos._scope.app.uri = uri;

						var _uriContext = _.first(_.split(uriContext, '|'));
						var _uriContexts = _uriContext.split('/');

						entityos._scope.app.uriContext = _uriContexts[0];
					}
					else
					{
						if (entityos._scope.route == undefined)
						{
							entityos._scope.route = {}
						}
						
						if (!data.isLoggedOn)
						{
							if (_.includes(uriContext, '|'))
							{
								entityos._scope.route.target =
									_.last(_.split(uriContext, '|'))
							}
							else
							{
								if (uri != entityos._scope.app.options.authURI)
								{
									entityos._scope.route.targetURI = uri;
									entityos._scope.route.targetURIContext = uriContext;
									entityos._scope.route.target = 
										entityos._scope.route.targetURI

									if (entityos._scope.route.targetURIContext != '')
									{ 
										entityos._scope.route.target = entityos._scope.route.target + 
											':' + entityos._scope.route.targetURIContext;
									}
								}	
							}
							
							//add any context that the current URL has. ie entityos._scope.app.dataContext
							uri = entityos._scope.app.options.authURI;

							if (entityos._scope.route.target != undefined)
							{
								uriContext = entityos._scope.app.options.authURIContext + '|' + entityos._scope.route.target;
							}
							else
							{
								uriContext = entityos._scope.app.options.authURIContext;
							}
						}	
						else
						{
							if (_.isUndefined(entityos._util.view.get(uri, uriContext)))
							{
								if (entityos._scope.route.target != undefined)
								{
									var _target = _.split(entityos._scope.route.target, ':');

									uri = _.first(_target);

									if (_.size(_target) > 1)
									{
										uriContext = _target[1]
									}
									else
									{
										uriContext = '';
									}
								}
								else
								{
									if (_.isEmpty(uri)) {uri = entityos._scope.app.options.startURI;}
									if (_.isEmpty(uriContext)) {uriContext = entityos._scope.app.options.startURIContext;}
								}	
							}
						}

						if (entityos._scope.app.view == undefined) {entityos._scope.app.view = {}}
						if (uri != undefined) {entityos._scope.app.view.uri = uri}
						if (uriContext != undefined) {entityos._scope.app.view.uriContext = uriContext}

						var view = entityos._util.view.get(uri);
						if (view != undefined)
						{	
							entityos._scope.app.view.data = view;
						}			

						entityos._scope.app.uri = uri;

						var _uriContext = _.first(_.split(uriContext, '|'));
						var _uriContexts = _uriContext.split('/');

						entityos._scope.app.uriContext = _uriContexts[0];

						if (window.location.pathname != uri && window.location.pathname != uri + '/')
						{
							window.location.href = uri + '/' + uriContext;
						}
						else
						{	
							if (uriContext != window.location.hash)
							{
								window.location.href = uri + '/' + uriContext;
							}
							else
							{
								if (_.isObject(entityos._scope.user))
								{
									$('.entityos-logon-first-name').html(entityos._scope.user.firstname);
									$('.entityos-logon-surname').html(entityos._scope.user.surname);
									$('.entityos-logon-name').html(entityos._scope.user.userlogonname);
                                    $('.myds-logon-first-name').html(entityos._scope.user.firstname);
									$('.myds-logon-surname').html(entityos._scope.user.surname);
									$('.myds-logon-name').html(entityos._scope.user.userlogonname);

                                    if (entityos.space != undefined)
                                    {
									    $('.entityos-logon-space').html(entityos.space.whoAmI().name);
                                        $('.myds-logon-space').html(entityos.space.whoAmI().name);
                                    
                                        if(entityos.space.isSwitched())
                                        {
                                            $('#entityos-logon-icon, .entityos-logon-icon, .entityos-logon-space').addClass('entityos-space-switched-in');
                                            $('#myds-logon-icon, .myds-logon-icon, .myds-logon-space').addClass('myds-space-switched-in');
                                        }
                                        else
                                        {
                                            $('#entityos-logon-icon, .entityos-logon-icon, .entityos-logon-space').removeClass('entityos-space-switched-in');
                                            $('#myds-logon-icon, .myds-logon-icon, .myds-logon-space').removeClass('myds-space-switched-in');
                                        }
                                    }
							
									entityos._util.controller.invoke(
									{
										name: 'app-route-to'
									},
									{
										uri: uri,
										uriContext: uriContext,
										reload: true
									});
								}
							}	
						}	
					}	
				}
			}
		},
		{
			name: 'app-route-to',
			code: function (data)
			{
				var uri = data.uri;
				var uriContext = data.uriContext;
				var isReload = data.reload;

				entityos._scope.app.uri = uri;

				var _uriContext = _.first(_.split(uriContext, '|'));
				var _uriContexts = _uriContext.split('/');

				entityos._scope.app.uriContext = _uriContexts[0];
				entityos._scope.app.dataContext = undefined;

				if (_uriContexts.length > 1)
				{
					entityos._scope.app.dataContext = _uriContexts[1];
				}
					
				var controller = entityos._scope.app.uriContext.replace('#', '');

				if (entityos._scope.data[controller] == undefined) {entityos._scope.data[controller] = {}}
				entityos._scope.data[controller].uriContext = undefined

				if (entityos._scope.app.dataContext != undefined)
				{
					entityos._scope.data[controller].uriContext = 
						decodeURI(entityos._scope.app.dataContext);

					entityos._scope.data[controller].uriDataContext = 
						decodeURI(entityos._scope.app.dataContext);

					if (_.startsWith(entityos._scope.data[controller].uriContext, '{') ||
							_.startsWith(entityos._scope.data[controller].uriContext, '['))
					{
						if (!_.isError(_.attempt(JSON.parse.bind(null, entityos._scope.data[controller].uriContext))))
						{
							entityos._scope.data[controller].dataContext = _.assign(entityos._scope.data[controller].dataContext,
								_.attempt(JSON.parse.bind(null, entityos._scope.data[controller].uriContext)));

							entityos._scope.data[controller] = _.assign(entityos._scope.data[controller],
								_.attempt(JSON.parse.bind(null, entityos._scope.data[controller].uriContext)));
						}
						else
						{
							entityos._scope.data[controller].dataContext = entityos._scope.data[controller].uriContext;
						}
					}
					else
					{
						entityos._scope.data[controller].dataContext = entityos._scope.data[controller].uriContext;
					}

					if (_.isString(entityos._scope.data[controller].dataContext))
					{
						entityos._scope.data[controller].id = entityos._scope.data[controller].dataContext
					}
				}	

				uriContext = entityos._scope.app.uriContext;

				$('.popover:visible').popover('hide');

				//looking for routing options

				if (entityos._scope.app.options.routing != undefined)
				{
					if (!entityos._scope.data.loaded)
					{
						if (!isReload)
						{
							isReload = (window.performance.navigation.type == 1)

							if (!isReload)
							{
								isReload = (_.isEmpty(document.referrer));
							}

							if (!isReload)
							{
								isReload = (_.includes(document.referrer, entityos._scope.app.options.authURI & '/'));
							}
						}
					}	

					var routingInstruction;

					if (entityos._scope.app.options.routing.toURI != undefined)
					{
						routingInstruction = _.find(entityos._scope.app.options.routing.toURI, function (instruction)
						{
							var instructionMatch = (instruction.uri == uri && _.includes(instruction.uriContext, uriContext))

							if (instructionMatch)
							{
								if (instruction.roles != undefined)
								{
									instructionMatch = entityos._util.access.has(
									{
										roles: _.map(instruction.roles, function (role) {return {title: role}})
									});
								}

								if (instruction.onlyApplyIfURIDataContextNotEmpty || instruction.onlyApplyIfURIDataContextSet)
								{
									instructionMatch = !_.isEmpty(entityos._scope.app.dataContext)
								}

								if (instructionMatch && instruction.onlyApplyIfDataIsEmpty)
								{
									instructionMatch = _.isEmpty(entityos._scope.data[controller])
								}

								if (instructionMatch && !instruction.applyEvenIfReload)
								{
									instructionMatch = isReload
								}
							}

							return instructionMatch
						});
					}

					if (_.isEmpty(routingInstruction))
					{
						if (entityos._scope.app.options.routing.toStart != undefined)
						{
							var routingInstruction = _.find(entityos._scope.app.options.routing.toStart, function (instruction)
							{
								var instructionMatch = 
								((instruction.uri == uri || instruction.uri == '*')
									&& (_.includes(instruction.uriContext, '*') || _.includes(instruction.uriContext, uriContext)))

								if (instructionMatch)
								{
									if (instruction.roles != undefined)
									{
										instructionMatch = entityos._util.access.has(
										{
											roles: _.map(instruction.roles, function (role) {return {title: role}})
										});
									}

									if (instruction.onlyApplyIfURIDataContextNotEmpty)
									{
										instructionMatch = !_.isEmpty(entityos._scope.app.dataContext)
									}

									if (instructionMatch && !instruction.applyEvenIfDataIsEmpty)
									{
										instructionMatch = _.isEmpty(entityos._scope.data[controller].controller)
									}

									if (instructionMatch && !instruction.applyEvenIfNotReload)
									{
										instructionMatch = isReload
									}
								}

								return instructionMatch
							});

							if (routingInstruction != undefined)
							{
								routingInstruction.redirect =
								{
									uri: entityos._scope.app.options.startURI,
									uriContext: entityos._scope.app.options.startURIContext
								}	
							}
						}
					}

					entityos._scope.data.loaded = true;

					if (routingInstruction != undefined)
					{
						if (routingInstruction.redirect != undefined)
						{
							if (routingInstruction.redirect.uri != undefined) {uri = routingInstruction.redirect.uri}
							if (routingInstruction.redirect.uriContext != undefined) {uriContext = routingInstruction.redirect.uriContext}
						}
					}
				}

				if ((window.location.pathname != uri && window.location.pathname != uri + '/') 
						|| window.location.hash.split('/')[0] != uriContext)
				{
					window.location.href = uri + '/' + uriContext;
				}
				else
				{
					entityos._util.view.render(uri, uriContext);
				}

				var param = 
				{
					uriContext: entityos._scope.app.uriContext,
					dataContext: entityos._scope.app.dataContext
				}

				if (!_.isEmpty(entityos._scope.app.dataContext))
				{
					param.id = entityos._scope.app.dataContext
				}

				if (_.isFunction(entityos._scope.app.viewNavigation))
				{
					entityos._scope.app.viewNavigation(param)
				}
				else
				{
					if (entityos._scope.app.viewNavigation != undefined)
					{
						entityos._util.controller.invoke(entityos._scope.app.viewNavigation, param);
					}
				}

				if (_.has(app, 'view'))
				{
					if (app.view[uriContext.replace('#', '')] != undefined)
					{
						app.view[uriContext.replace('#', '')](param);
					}
				}

				if (_.isObject(entityos._util.controller))
				{
					if (entityos._util.controller.code[uriContext.replace('#', '')] != undefined)
					{
						entityos._util.controller.code[uriContext.replace('#', '')](param);
					}
				}

				$('a[href="' + uriContext + '-' + entityos._scope.app.dataContext + '"]').click();

			}
		},
		{
			name: 'app-route-check',
			code: function (param)
			{
				var uri = entityos._util.param.get(param, 'uri',
						{default: entityos._scope.app.uri}).value;

				var uriContext = entityos._util.param.get(param, 'uriContext',
						{default: entityos._scope.app.uriContext}).value;

				var dataContext = entityos._util.param.get(param, 'dataContext',
						{default: entityos._scope.app.dataContext}).value;

				var isReload = entityos._util.param.get(param, 'isReload').value;

				var routeValid

				if (entityos._scope.app.options.routing.toURI == undefined)
				{
					routeValid = true;
				}
				else
				{
					routeValid = false;

					var routingInstruction = _.find(entityos._scope.app.options.routing.toURI, function (instruction)
					{
						var instructionMatch = (instruction.uri == uri && _.includes(instruction.uriContext, uriContext))

						if (instructionMatch)
						{
							if (instruction.roles != undefined)
							{
								instructionMatch = entityos._util.access.has(
								{
									roles: _.map(instruction.roles, function (role) {return {title: role}})
								});
							}

							if (instruction.onlyApplyIfURIDataContextNotEmpty || instruction.onlyApplyIfURIDataContextSet)
							{
								instructionMatch = !_.isEmpty(dataContext)
							}

							if (instructionMatch && instruction.onlyApplyIfDataIsEmpty)
							{
								var controller = entityos._scope.app.uriContext.replace('#', '');
								instructionMatch = _.isEmpty(entityos._scope.data[controller])
							}

							if (instructionMatch && !instruction.applyEvenIfReload)
							{
								instructionMatch = isReload
							}

							if (!routeValid)
							{
								routeValid = instructionMatch;
							}
						}
					});
				}

				return routeValid;
			}
		},
		{
			name: 'app-working-start',
			code: function (param)
			{
				var selector = entityos._util.param.get(param, 'selector', {default: '#app-working'}).value;
				$(selector).removeClass('hidden d-none');
			}
		},
		{
			name: 'app-working-stop',
			code: function ()
			{
				var selector = entityos._util.param.get(param, 'selector', {default: '#app-working'}).value;
				$(selector).addClass('hidden d-none');
			}
		},
		{
			name: 'util-working-show',
			code: function (selector)
			{
				if (selector != undefined)
				{
					$(selector).html(entityos._scope.app.options.working);
				}
			}
		},
		{
			name: 'app-notify',
			alias: 'notify',
			code: function (param)
			{
				var message; 
				var type;
				var time;
				var showDismiss;
				var persist;
				var header;
				var selector;  
				var animation;
				var dismiss;
				var small;
				var animationClass;

				if (typeof param == 'object')
				{
					message = entityos._util.param.get(param, 'message').value;
					time = entityos._util.param.get(param, 'time').value;
					persist = entityos._util.param.get(param, 'persist').value;
					animation = entityos._util.param.get(param, 'animation').value;
					header = entityos._util.param.get(param, 'header').value;
					selector = entityos._util.param.get(param, 'selector').value;
					small = entityos._util.param.get(param, 'small').value;
					dismiss = entityos._util.param.get(param, 'dismiss').value;
					type = entityos._util.param.get(param, 'class').value;
					animationClass = entityos._util.param.get(param, 'animationClass').value;

					if (type == undefined)
					{
						type = entityos._util.param.get(param, 'type').value;
					}

					showDismiss = entityos._util.param.get(param, 'showDismiss').value;					
				}
				else
				{
					message = param;
				}

				if (animationClass == undefined)
				{
					animationClass = 'animated slideInDown'
				}

				if (type == undefined && _.includes(_.toLower(message), 'delete'))
				{
					type = 'danger'
				}

				if (type == 'error') {type = 'danger'}

				if (type == undefined && entityos._scope.app.options.styles != undefined)
				{
					if (entityos._scope.app.options.styles.toast != undefined)
					{
						type = entityos._scope.app.options.styles.toast.class;
					}
				}

				if (type == undefined)
				{
					type = 'info'
				}

				if (persist == undefined)
				{
					persist = false;

					if (type == 'danger')
					{
						persist = true;
					}
				}

				if (showDismiss == undefined && entityos._scope.app.options.styles != undefined)
				{
					if (entityos._scope.app.options.styles.toast != undefined)
					{
						showDismiss = entityos._scope.app.options.styles.toast.showDismiss;
					}
				}

				if (time == undefined && entityos._scope.app.options.styles != undefined)
				{
					if (entityos._scope.app.options.styles.toast != undefined)
					{
						time = entityos._scope.app.options.styles.toast.time;
					}
				}

				if (time == undefined)
				{
					time = 2000
				}

				if (animation == undefined && entityos._scope.app.options.styles != undefined)
				{
					if (entityos._scope.app.options.styles.toast != undefined)
					{
						animation = entityos._scope.app.options.styles.toast.animation;
					}
				}

				if (animation == undefined)
				{
					animation = true
				}

				if (dismiss == undefined && entityos._scope.app.options.styles != undefined)
				{
					if (entityos._scope.app.options.styles.toast != undefined)
					{
						dismiss = entityos._scope.app.options.styles.toast.dismiss;
					}
				}

				if (dismiss == undefined)
				{
					dismiss = '<i class="fa fa-times text-muted" style="font-size:1rem;">'
				}

				if (message == undefined && entityos._scope.data['notify-message'] != undefined)
				{
					message = entityos._scope.data['notify-message'];
					entityos._scope.data['notify-message'] = undefined;
				}

				if (typeof $.notify == 'function')
				{	
					if (persist)
					{
						time = 0;
						showDismiss = true;
					}

					$.notify(
					{
						message: '<div class="text-center">' + message + '</div>'
					},
					{
						allow_dismiss: showDismiss,
						type: type,
						delay: time,
						z_index: 9999,
						placement:
						{
							from: "top",
							align: "center"
						},
						__template:
							'<div data-notify="container" class="col-xs-11 col-sm-3 alert alert-{0}" role="alert">' +
							'<button type="button" class="close" data-notify="dismiss" style="position: absolute; right: 10px; top: 5px; z-index: 10001;">{1}</button>' +
							'<div data-notify="message" class="text-center">{2}</div>' +
							'</div>'
					});
				}
				else if (_.isObject(window.toastr))
				{
					if (type.toLowerCase() == 'danger') {type = 'error'}

					toastr.options =
					{
						closeButton: true,
						preventDuplicates: false,
						positionClass: 'toast-top-right',
						onclick: null,
						showDuration: 400,
						hideDuration: 1000,
						timeOut: 3000,
						extendedTimeOut: 1000,
						showEasing: 'swing',
						hideEasing: 'linear',
						showMethod: 'fadeIn',
						hideMethod: 'fadeOut'
					}

					if (_.isFunction(toastr[type]))
					{
						toastr[type](message)
					}
					else
					{
						alert(message);
					}
				}
				else if (typeof $.fn.toast == 'function')
				{		
					if ($('#entityos-toast').length == 0)
					{
						$(selector).append(
							'<div id="entityos-toast" class="position-absolute w-100 d-flex flex-column p-4" aria-live="assertive" aria-atomic="true"></div>');
					}

                    if ($('#myds-toast').length == 0)
					{
						$(selector).append(
							'<div id="myds-toast" class="position-absolute w-100 d-flex flex-column p-4" aria-live="assertive" aria-atomic="true"></div>');
					}

					var html	= 
						'<div class="toast ml-auto ' + animationClass + '" role="alert" style="min-width:260px;">';

					if (header != undefined || showDismiss == true)
					{
	  					html = html + '<div class="toast-header">';
					}

					if (header == undefined && showDismiss == true)
					{
						if (type == 'info')
						{
							header = '<i class="fa fa-info-circle" style="font-size:1.6em; color:lightblue;"></i>'
						}
						else if (type == 'danger')
						{
							header = '<i class="fa fa-exclamation-triangle" style="font-size:1.6em; color:red;"></i>'
						}
						else
						{
	  						header = '&nbsp;'
	  					}
					}

	  				if (header != undefined)
	  				{
	  					html = html + '<strong class="mr-auto">' + header + '</strong>';
	  				}

	  				if (small != undefined)
	  				{
	  					html = html + '<small>' + small + '</small>'
	  				}

	  				if (showDismiss == true)
					{
	  					html = html + '<button type="button" class="ml-2 mb-1 close entityos-click myds-click" data-controller="util-view-notify-hide" data-dismiss="toast" aria-label="Close">' +
	      							'<span aria-hidden="true">' + dismiss + '</i></span>' +
	    							'</button>';
	    			}

	    			if (header != undefined || showDismiss == true)
					{
	  					html = html + '</div>';
	  				}

	  				if (message != undefined)
	  				{
	  					html = html +
  							'<div class="toast-body">' +
  								message + 
  							'</div>';
  					}

  					html = html +		
	  					'</div>';

	  				$('#entityos-toast').html(html);
                    $('#myds-toast').html(html);
					$('.toast').toast({delay: time, autohide: !persist, animation: animation})
					$('.toast').toast('show')

				}
				else
				{
					alert(message);
				}	
			}
		},
		{
			name: 'util-on-complete',
			code: function (param)
			{
				var onCompleteController = entityos._util.param.get(param, 'onCompleteController').value;
				var onCompleteControllerWhenCan = entityos._util.param.get(param, 'onCompleteControllerWhenCan').value;
				var controller = entityos._util.param.get(param, 'controller').value;
				var callback = entityos._util.param.get(param, 'callback').value;
				
				if (onCompleteController != undefined)
				{
					entityos._util.param.set(param, 'onComplete', onCompleteController);
				}

				if (controller != undefined)
				{
					entityos._util.param.set(param, 'onComplete', controller);
				}

				if (callback != undefined)
				{
					entityos._util.param.set(param, 'onComplete', callback);
				}

				if (onCompleteControllerWhenCan != undefined)
				{
					entityos._util.param.set(param, 'onCompleteWhenCan', onCompleteControllerWhenCan);
				}

				entityos._util.onComplete(param)
			}
		},
		{
			name: 'util-validate-check',
			code: function (param)
			{
				entityos._util.validate.check(param)
			}
		},
		{
			name: 'util-view-menu-set-active',
			code: function (param)
			{
				entityos._util.menu.set(param);
			}
		},
		{
			name: 'util-view-button-set-active',
			code: function (param)
			{
				var selector = entityos._util.param.get(param, 'selector').value;
				var element = $(selector);
				if (!_.isEmpty(element))
				{
					element.addClass("active").siblings('.entityos-button-group').removeClass("active");
                    element.addClass("active").siblings('.myds-button-group').removeClass("active");
				}
			}
		},
		{
			name: 'util-whoami',
			alias: 'whoami',
			code: function (param)
			{
				return entityos._util.whoami(param);
			}
		},
		{
			name: 'util-health-check',
			alias: 'healthCheck',
			code: function (param)
			{
				return entityos._util.healthCheck.run(param);
			}
		},
		{
			name: 'util-attachment-upload-initialise',
			code: function (param)
			{
				entityos._util.attachment.dropzone.init(param)
			}
		},
		{
			name: 'util-attachment-upload-process',
			code: function (param)
			{
				var context = entityos._util.param.get(param, 'context').value;
				var target = entityos._util.param.get(param.dataContext, 'target', {default: '#util-attachment-upload-container'}).value;
				var typeRequired = entityos._util.param.get(param.dataContext, 'typeRequired', {default: false}).value;
				var anywhere = entityos._util.param.get(param.dataContext, 'anywhere', {default: false}).value;
				if (anywhere) {target = 'document.body'}

				var type = '';
				if (context != undefined)
				{
					type = entityos._util.data.get(
					{
						scope: context + '-attachments-upload',
						context: 'type',
						valueDefault: ''
					});
				}

				if (type == '' && typeRequired)
				{
					entityos._util.controller.invoke('app-notify', {type: 'error', message: 'You must set a type before uploading.'})
				}
				else
				{
					var name = entityos._util.param.get(param, 'name').value;
					if (name == undefined)
					{
						name = _.camelCase(target)
					}

					if (_.has(entityos, '_util.attachment.dropzone.object'))
					{
						if (entityos._util.attachment.dropzone.object[name] != undefined)
						{
							if (_.isFunction(entityos._util.attachment.dropzone.object[name].processQueue))
							{
								entityos._util.attachment.dropzone.object[name].processQueue()
							}
						}
					}
				}
			}
		},
		{
			name: 'util-attachment-upload-clear',
			code: function (param)
			{
				var target = entityos._util.param.get(param.dataContext, 'target', {default: '#util-attachment-upload-container'}).value;
				var anywhere = entityos._util.param.get(param.dataContext, 'anywhere', {default: false}).value;
				if (anywhere) {target = 'document.body'}

				var name = entityos._util.param.get(param, 'name').value;
				if (name == undefined)
				{
					name = _.camelCase(target)
				}

				if (_.has(entityos, '_util.attachment.dropzone.object'))
				{
					if (entityos._util.attachment.dropzone.object[name] != undefined)
					{
						if (_.isFunction(entityos._util.attachment.dropzone.object[name].removeAllFiles))
						{
							entityos._util.attachment.dropzone.object[name].removeAllFiles()
						}
					}
				}
			}
		},
		{
			name: 'util-cloud-search',
			code: function (param)
			{
				return entityos.cloud.search(param)
			}
		},
		{
			name: 'util-cloud-save',
			code: function (param)
			{
				return entityos.cloud.save(param)
			}
		},
		{
			name: 'util-cloud-delete',
			code: function (param)
			{
				return entityos.cloud.delete(param)
			}
		},
		{
			name: 'util-cloud-auth',
			code: function (param)
			{
				return entityos.cloud.auth(param)
			}
		},
		{
			name: 'util-cloud-deauth',
			code: function (param)
			{
				return entityos.cloud.deauth(param)
			}
		},
		{
			name: 'util-cloud-invoke',
			code: function (param)
			{
				return entityos.cloud.invoke(param)
			}
		},
		{
			name: 'util-cloud-upload',
			code: function (param)
			{
				return entityos.cloud.upload(param)
			}
		},
		{
			name: 'util-cloud-check',
			code: function (param)
			{
				return entityos.cloud.check(param)
			}
		},
		{
			name: 'util-svg-to-image',
			code: function (param)
			{
				return entityos._util.svgToImage(param)
			}
		},
		{
			name: 'util-svg-as-image',
			code: function (param)
			{
				return entityos._util.svgAsImageWithStyles(param)
			}
		},
		{
			name: 'util-image-to-base64',
			code: function (param)
			{
				return entityos._util.imageToBase64Data(param)
			}
		}
	]);

	entityos._util.controller.add(
	{
		name: 'util-attachment-check',
		code: function (param)
		{
			var fileSize;
			var fileSizeMax = 10e6;
			
			var id = param.dataContext.id;
			
			if (entityos._scope.data['util-attachment-check']._file.length > 0)
			{
				if (entityos._scope.data['util-attachment-check']._file[0].files != undefined)
				{
					fileSize = _namespace.data['util-attachment-check']._file[0].files[0].size
				}
			}
			
			var status = s.replaceAll(id, '-file0', '-status');
			
			if (entityos._util.controller.code[status] != undefined)
			{
				param.fileOverSize = (fileSize > fileSizeMax);
				param.fileSize = fileSize;
				param.fileSizeMax = fileSizeMax;
				entityos._util.controller.code[status](param);	
			}
			else
			{
				entityos._util.view.queue.show('#' + s.replaceAll(id, '-file0', '-status'), '');

				if (fileSize > fileSizeMax)
				{
					entityos._util.view.queue.clear({queue: 'util-attachment-check'});
					entityos._util.view.queue.add('<div class="alert alert-danger m-b" role="alert">The file you are about to upload is large, so it may take some time to upload.  Please do not close the web-browser until the upload is completed.  Thank you.</div>', {queue: 'util-attachment-check'})
					entityos._util.view.queue.render('#' + s.replaceAll(id, '-file0', '-status'), {queue: 'util-attachment-check'});
				}
			}
		}
	});

	entityos._util.controller.add(
	{
		name: 'util-clear',
		code: function (param)
		{
			var target = entityos._util.param.get(param.dataContext, 'target').value;
			var controller = entityos._util.param.get(param.dataContext, 'controllerAfter').value;

			if (target != undefined)
			{	
		 		$('#' + target + ' input').prop('checked', false)
		 	}

		 	if (controller != undefined)
			{	
		 		if (entityos._util.controller.code[controller] != undefined)
		 		{
		 			entityos._scope.data[controller] = {}
		 			entityos._util.controller.code[controller]({dataContext: {}})
		 		}
		 	}
		}
	});

	entityos._util.controller.add(
	{
		name: 'util-user-switches',
		code: function (param, response)
		{
			var switchSpaces = entityos._util.data.get(
			{
				controller: 'util-user-switches',
				context: 'switchSpaces'
			});
			
			if (response == undefined)
			{
				if (param.dataContext != undefined)
				{
					entityos._util.data.set(
					{
						controller: 'util-user-switches',
						context: 'view',
						value: param.dataContext.view
					});
				}	

				if (entityos._scope._user == undefined)
				{
					entityos._scope._user = _.clone(entityos._scope.user)
					entityos._scope._user.context = _.clone(entityos._scope.user.context)
				}
				
				entityos.retrieve(
				{
					object: 'core_space',
					data:
					{
						criteria:
						{
							fields:
							[
								{name: 'space'},
								{name: 'spacetext'},
								{name: 'targetuser'},
								{name: 'targetusercontactbusiness'},
								{name: 'targetusercontactbusinesstext'},
								{name: 'targetusertext'}
							]
						}
					},
					set:
					{
						controller: 'util-user-switches',
						data: 'switchSpaces'
					},
					callback: entityos._util.controller.code['util-user-switches']
				})
			}
			else
			{
				switchSpaces = response.data.rows;

				entityos._util.data.set(
				{
					controller: 'util-user-switches',
					context: 'switchSpaces',
					value: switchSpaces
				});

				var view = entityos._util.data.get(
				{
					controller: 'util-user-switches',
					context: 'view'
				});

				if (view == undefined) {view = '#nav-user-switch-view'}

				entityos._util.view.queue.clear({queue: 'util-user-switches'});
				
				entityos._util.view.queue.add('<li><a href="#" class="myds" style="padding-top:3px;padding-bottom:3px;" data-controller="util-user-switch-to" data-context="{{context}}" data-id="{{id}}"' +
						   ' data-contactbusiness="{{targetusercontactbusiness}}"' +
						   ' data-contactbusinesstext="{{targetusercontactbusinesstext}}"' +
						   '>{{country}}</li>',
						   {queue: 'util-user-switches', type: 'template'});

				if (_.size(switchSpaces) != 0)
				{
					//entityos._util.view.queue.add('<div class="text-muted text-center m-t m-b-0">Switch to</div>', {queue: 'util-user-switches'});
				
					entityos._util.view.queue.add('<div class="nav nav-stacked">', {queue: 'util-user-switches'});
					
					_.each(switchSpaces, function (switchSpace)
					{
						var member = _.find(entityos._scope.data.members, function (m) {return m.tradename == switchSpace.targetusercontactbusinesstext});

						if (member != undefined)
						{
							switchSpace.context = 'switch';
							switchSpace.country = member.streetcountry;
							//switchspace.targetusercontactbusinesstext = _.unescapeHTML(switchspace.targetusercontactbusinesstext);
							entityos._util.view.queue.add({queue: 'util-user-switches', useTemplate: true}, switchSpace);
						}	
					});

					var countryName = entityos._scope._user.context.countryName;
					if (countryName == '') {countryName = 'Switch back'}

					entityos._util.view.queue.add({queue: 'util-user-switches', useTemplate: true},
					{
						id: '',
						targetusercontactbusiness: entityos._scope._user.contactbusiness,
						targetusercontactbusinesstext: entityos._scope._user.contactbusinesstext,
						country: countryName,
						context: 'switch-back'
					});
				}
				
				entityos._util.view.queue.add('</div>', {queue: 'util-user-switches', type: 'template'});

				entityos._util.view.queue.render(view, {queue: 'util-user-switches'});
			}
		}
	});

	entityos._util.controller.add(
	{
		name: 'util-user-switch-to',
		code: function (param, response)
		{
			if (response == undefined)
			{
				if (entityos._scope._user == undefined)
				{
					entityos._scope._user = _.clone(entityos._scope.user)
				}
				
				var data =
				{
					id: param.dataContext.id,
				}
				
				if (param.dataContext.context == 'switch')
				{
					data.switch = 1
				}
				else
				{
					data.switchback = 1
				}

				entityos.update(
				{
					object: 'core_space',
					data: data,
					callback: entityos._util.controller.code['util-user-switch-to']
				});
			}
			else
			{
				if (response.status == 'OK')
				{
					var switchData = entityos._util.data.get(
					{
						controller: 'util-user-switch-to'
					});
					
					entityos._scope.user.contactbusiness = switchData.contactbusiness;
					entityos._scope.user.contactbusinesstext = switchData.contactbusinesstext;
					
					entityos._util.controller.invoke('app-navigation');
				}
			}
		}
	});

	entityos._util.controller.add(
	{
		name: 'util-view-select',
		code: function (param, response)
		{
			var scope = entityos._util.param.get(param, 'sourceScope').value;
			var context = entityos._util.param.get(param, 'sourceContext').value;
			var name = entityos._util.param.get(param, 'sourceName').value;
			var useCache = entityos._util.param.get(param, 'useCache', {default: false}).value;
			var container = entityos._util.param.get(param, 'container').value;
			var object = entityos._util.param.get(param, 'object').value;
			var controller = entityos._util.param.get(param, 'sourceController').value;
			var field = entityos._util.param.get(param, 'field').value;
			var data = entityos._util.param.get(param, 'data').value;
			var optionsExist = entityos._util.param.get(param, 'optionsExist').value;
			var defaultValue =  entityos._util.param.get(param, 'defaultValue').value;
			var value =  entityos._util.param.get(param, 'value').value;
			var hideSearch = entityos._util.param.get(param, 'hideSearch', {default: false}).value;
			var objectFilters = entityos._util.param.get(param, 'filter').value;
			var responseController = entityos._util.param.get(param, 'responseController').value;
			var queryController = entityos._util.param.get(param, 'queryController').value;
			var fields = entityos._util.param.get(param, 'fields').value;
			var idField = entityos._util.param.get(param, 'idField', {default: 'id'}).value;
			var invokeChange = entityos._util.param.get(param, 'invokeChange', {default: true}).value;
			var clearOptions = entityos._util.param.get(param, 'clearOptions', {default: true}).value;
			var rows = entityos._util.param.get(param, 'rows').value;
            var customOptions = entityos._util.param.get(param, 'customOptions').value;
			var searchMinimumCharacters = mydigitalstructure._util.param.get(param, 'searchMinimumCharacters', {default: 0}).value;

			if (defaultValue == undefined)
			{
				defaultValue = value;
			}

			if (objectFilters == undefined)
			{
				objectFilters = entityos._util.param.get(param, 'filters').value;
			}

			var filters = [];

			if (objectFilters != undefined)
			{
				if (_.isArray(objectFilters))
				{
					filters = _.concat(filters, objectFilters)
				}
				else if (_.isObject(objectFilters))
				{
					filters.push(objectFilters)
				}
				else
				{
					var _objectFilters = _.attempt(JSON.parse.bind(null, objectFilters));

					if (!_.isError(_objectFilters))
					{
						if (_.isObject(_objectFilters))
						{
							filters.push(_objectFilters)
						}
						else if (_.isArray(_objectFilters))
						{
							filters = _.concat(filters, _objectFilters)
						}
					}
				}

				_.each(filters, function (filter)
				{
					if (filter.value1 == undefined) {filter.value1 = filter.value}
					if (filter.name == undefined) {filter.name = filter.field}
					if (filter.comparison == undefined) {filter.comparison = 'EQUAL_TO'}
				});
			}

			var element;

			if (container != undefined)
			{
				element = $('#' + container);

				if (element != undefined)
				{
					if (scope == undefined)
					{
						scope = element.attr('data-source-scope');
					}

					if (context == undefined)
					{
						context = element.attr('data-source-context');
					}

					if (controller == undefined)
					{
						controller = element.attr('data-source-controller');
					}
				}
			}
			else if (scope != undefined && context != undefined)
			{
				element = $('[data-scope="' + scope + '"][data-context="' + context + '"]');
			}
			else if (scope != undefined)
			{
				element = $('[data-scope="' + scope + '"]');
			}

			if (object == undefined)
			{
				object = element.attr('data-object');
			}

			if (element != undefined)
			{
				$(element).data('_objectfilters', filters);

				if (object != undefined && clearOptions)
				{
					element.find('option').remove();
				}

				if (optionsExist == undefined)
				{
					optionsExist = (element.find('option').length != 0)
				}

				if (defaultValue == undefined)
				{
					defaultValue = 
					{ 
						id: element.attr('data-id'),
						text: element.attr('data-text')
					}
				}
				else
				{
					if (!_.isArray(defaultValue))
					{
						if (defaultValue.id == undefined) 
						{ 
							defaultValue.id = element.attr('data-id')
						}

						if (defaultValue.text == undefined) 
						{ 
							defaultValue.text = element.attr('data-text')
						}
					}
				}

				if (field == undefined)
				{
					field = element.attr('data-field');
				}

				if (field == undefined)
				{
					field = 'title'
				}

				if (fields == undefined && field != undefined)
				{
					fields = [{name: field, sortBy: true}]
				}

				if (typeof $.fn.select2 == 'function')
				{
					var selectParam = 
					{
						theme: 'bootstrap4',
						allowClear: false,
						language:
						{
						  searching: function ()
						  {
						    return 'Searching ...';
						  }
						},
						minimumInputLength: searchMinimumCharacters
					}

					selectParam = _.assign(selectParam, param.options);

					if (data != undefined)
					{
						selectParam.data = data;
					}
					else if (controller != undefined)
					{
						selectParam.data = entityos._util.controller.invoke(controller, param);
					}
					else if (scope != undefined)
					{
						selectParam.data = entityos._util.data.get(
						{
							scope: scope,
							context: context,
							name: name
						});
					}
					else if (object != undefined && !optionsExist)
					{
						var endpoint = object.split('_')[0];	

						var ajax = 
						{
							url: '/rpc/' + endpoint + '/?method=' + object + '_search',
							type: 'POST',
							delay: 500,
							global: false,
							data: function (query)
							{
								var dataQuery = {};

								if (queryController != undefined)
					    		{
					    			var _dataQuery = entityos._util.controller.invoke(queryController,
					    			{
					    				search: query.term,
					    				fields: fields,
					    				filters: filters,
					    				dataContext: $(element).data()
					    			})

					    			if (_.isObject(_dataQuery))
					    			{
					    				var _criteria;

					    				if (_.has(_dataQuery, 'criteria'))
					    				{
					    					_criteria = _dataQuery.criteria;
					    				}
					    				else
					    				{
					    					_criteria = _dataQuery;
					    				}

					    				if (_.isObject(_criteria))
				    					{
				    						dataQuery.criteria = JSON.stringify(_criteria);
				    					}
				    					else
				    					{
				    						dataQuery.criteria = _criteria;
				    					}
					    			}
					    		}
					    		else
					    		{
							    	var dataQueryFields = [];
							    	var dataQuerySorts = [];

							    	_.each(fields, function (field)
							    	{
							    		dataQueryFields.push({name: field.name});

							    		if (field.sortBy)
							    		{
							    			dataQuerySorts.push({name: field.name, direction: 'asc'});
							    		}
							    	});

							    	if (dataQuerySorts.length == 0)
							    	{
							    		dataQuerySorts.push({name: _.first(dataQueryFields).name, direction: 'asc'});
							    	}

							    	var dataQueryFilters = [];

							    	var _dataQueryFilters = $(element).data('_objectfilters');

							    	if (_dataQueryFilters != undefined)
							    	{
							    		_.each(_dataQueryFilters, function (dataQueryFilter)
							    		{
							    			var dataParam = {};

							    			if (dataQueryFilter.valueScope != undefined)
							    			{
							    				dataParam.scope = dataQueryFilter.valueScope;
							    			}

							    			if (dataQueryFilter.valueContext != undefined)
							    			{
							    				dataParam.context = dataQueryFilter.valueContext;
							    			}

							    			if (dataQueryFilter.valueName != undefined)
							    			{
							    				dataParam.name = dataQueryFilter.valueName;
							    			}

							    			if (!_.isEmpty(dataParam))
							    			{
							    				dataQueryFilter.value1 = entityos._util.data.get(dataParam)
							    			}

							    		});

							    		dataQueryFilters = _.concat(dataQueryFilters, _dataQueryFilters)
							    	}

							    	if (query.term != undefined)
							    	{
							    		_.each(fields, function (field, f)
							    		{
							    			if (f != 0)
							    			{
							    				dataQueryFilters.push({name: 'or'});
							    			}
							    			dataQueryFilters.push({name: field.name, comparison: 'TEXT_IS_LIKE', value1: query.term});
							    		});
							    	}

							    	var dataQueryRows = 20;

							    	if (_.has(entityos, '_scope.app.options.rows'))
							    	{
							    		dataQueryRows = entityos._scope.app.options.rows;
							    	}

							    	if (!_.isUndefined(rows))
							    	{
							    		dataQueryRows = rows;
							    	}

                                    var dataCustomOptions = customOptions;

							        dataQuery =
							        {
										criteria: JSON.stringify(
										{
											fields: dataQueryFields,
											filters: dataQueryFilters,
											sorts: dataQuerySorts,
											options: {rows: dataQueryRows},
                                            customoptions: dataCustomOptions
										})
							        }
							    }
						  
					      	return dataQuery;
					    	},

					    	processResults: function (response)
					    	{
					    		var results;

					    		if (_.has(response.data, 'rows'))
								{
									_.each(response.data.rows, function (row)
									{
										_.each(row, function (value, field)
										{
											row[field] = _.unescape(value);
										});
									});
								}

					    		if (responseController != undefined)
					    		{
					    			results = entityos._util.controller.invoke(responseController, param, response)
					    		}
					    		else
					    		{
						    		_.each(response.data.rows, function (row)
									{
										var text = [];

										_.each(fields, function (field)
										{
											if (field.hidden != true)
											{
												if (field.removeText != undefined)
												{
													row[field.name] = row[field.name].replace(field.removeText, '');
												}

												text.push(row[field.name]);
											}
										});

										row.text = _.join(text, ' ');
										row.id = row[idField];
									});

									results = response.data.rows;
				            }

						     return { results: results };
						   }
					  	}

					  	selectParam.ajax = ajax;
					}
					else if (!optionsExist)
					{
						selectParam.data = entityos._util.data.get(param);
					}

					if (selectParam.minimumResultsForSearch == undefined && (optionsExist || hideSearch))
					{
						selectParam.minimumResultsForSearch = Infinity;
					}

					$(element).select2(selectParam);

					if (defaultValue != undefined)
					{
						if (!_.isArray(defaultValue))
						{
							if (defaultValue.id != undefined && defaultValue.text != undefined)
							{
								if ($(element).find("option[value='" + defaultValue.id + "']").length != 0)
								{
								    $(element).val(defaultValue.id) //.trigger('change');
								}
								else
								{ 
								    var newOption = new Option(defaultValue.text, defaultValue.id, true, true);
								    $(element).append(newOption) //.trigger('change');
								} 
							}
						}
						else
						{
							_.each(defaultValue, function (value)
							{
								if (value.id != undefined && value.text != undefined)
								{
									 var newOption = new Option(value.text, value.id, true, true);
								    $(element).append(newOption);
								}
							});

							//$(element).trigger('change');
						}

						if (invokeChange) { $(element).trigger('change'); }
					}
				}

				else if (typeof $.fn.chosen == 'function')
				{
					console.log('Chosen not supported yet.')
				}

				else if (typeof $.fn.typeahead == 'function')
				{
					console.log('Typeahead not supported yet.')
				}
			}
		}
	});

	entityos._util.controller.add(
	{
		name: 'util-view-table',
		code: function (param, response)
		{
			var context = entityos._util.param.get(param, 'context').value;
			var useCache = entityos._util.param.get(param, 'useCache', {default: false}).value;
			var goToPageWhenCan = entityos._util.param.get(param, 'goToPageWhenCan', {default: false}).value;
			var goToPageNumber = entityos._util.param.get(param, 'goToPageNumber').value;
			var container = entityos._util.param.get(param, 'container').value;
			var keepHidden = entityos._util.param.get(param, 'keepHidden', {default: false}).value;
			var userRoles = entityos._util.param.get(param, 'roles', {default: []}).value;
			var userHasAccess = (userRoles.length == 0);
			var hide = entityos._util.param.get(param, 'hide', {default: false}).value;
           	var refresh = entityos._util.param.get(param, 'refresh', {default: false}).value;
               					
			if (!userHasAccess)
			{
				_.each(userRoles, function (role)
				{
					if (!userHasAccess)
					{	
						userHasAccess = entityos._util.user.roles.has({role: role, exact: false})
					}	
				});
			}

			if (userHasAccess)
			{
				var dataCache = entityos._util.data.get(
				{
					scope: 'util-view-table-cache',
					context: context
				});

				if (useCache && !_.isUndefined(dataCache))
				{
					$('#' + container).html(dataCache);
					if (!keepHidden)
					{
						$('#' + container).removeClass('hidden d-none');
					}
				}
				else
				{
					if (hide) {$('#' + container).addClass('hidden d-none')};

					if (response != undefined || param.sort != undefined || param.rowsPerPage != undefined)
					{
						if (response != undefined)
						{
							if (response.error != undefined)
							{
								if (response.error.errorcode == 3)
								{
									response.data = {rows: []}
								}
							}

							if (context == undefined)
							{
								context = entityos._util.param.get(param.data, 'context').value;
							}
						}

						var sort = param.sort;
						var rowsPerPage = param.rowsPerPage;

						param = entityos._util.data.get(
						{
							scope: context,
							context: '_param'
						});

						if (sort != undefined)
						{
							param.sort = sort;
						}
				
						if (rowsPerPage != undefined)
						{
							param.options.rows = rowsPerPage.count;
						}

                        refresh = entityos._util.param.get(param, 'refresh', {default: false}).value;
					}

                    if (refresh)
                    {
						var refreshContext = context;

						if (refreshContext == undefined && container != undefined)
						{
							refreshContext = '_table-' + container;
						}

						if (refreshContext != undefined)
						{
							var _param = entityos._util.data.get(
							{
								scope: refreshContext,
								context: '_param'
							});

							if (_param != undefined)
							{
								if (_param.sort != undefined) { _param.sorts = [_param.sort]}
								param = _.assign(_param, param)
							}

							if (goToPageNumber == undefined)
							{
								var _paging = entityos._util.data.get(
								{
									scope: 'util-view-table',
									context: refreshContext
								});

								if (_param != undefined && !_.has(response, 'data'))
								{
									if (_paging.currentPage != undefined)
									{
										goToPageNumber = _paging.currentPage;
										param.goToPageNumber = _paging.currentPage;
									}
								}
                       		}
						}
                    }
					else
					{
						var clearContext = context;

						if (clearContext == undefined && container != undefined)
						{
							clearContext = '_table-' + container;
						}

						/*entityos._util.data.clear(
						{
							scope: 'util-view-table',
							context: clearContext
						});*/
					}

					var callback = entityos._util.param.get(param, 'callback', {default: 'util-view-table'}).value;
					var format = entityos._util.param.get(param, 'format').value;
					var filters = entityos._util.param.get(param, 'filters').value;
					var customOptions = entityos._util.param.get(param, 'customOptions').value;
					if (customOptions == undefined)
					{
						customOptions = entityos._util.param.get(param, 'customoptions').value;
					}
					var sorts = entityos._util.param.get(param, 'sorts').value;
					var options = entityos._util.param.get(param, 'options').value;
					var object = entityos._util.param.get(param, 'object').value;
					var controller = entityos._util.param.get(param, 'controller').value;
					var scope = entityos._util.param.get(param, 'scope').value;
					var container = entityos._util.param.get(param, 'container').value;
					var deleteConfirm = entityos._util.param.get(param, 'deleteConfirm').value;
					var containerClass = entityos._util.param.get(param, 'containerClass').value;

					var rows = entityos._util.param.get(options, 'rows').value;

					var select = entityos._util.param.get(param, 'select').value;
					if (select == undefined && options != undefined)
					{
						select = options.select;
					}

					if (select == undefined) {select = {}}

					if (controller == undefined) {controller = container}

					if (container == undefined)
					{
						container = controller + '-view'
					}

					if (context == undefined && controller != undefined)
					{
						context = '_table-' +  controller;
						param = entityos._util.param.set(param, 'context', context)
					}

					if (context == undefined && controller == undefined && scope != undefined)
					{
						context = scope;
						param = entityos._util.param.set(param, 'context', context)
					}

					if (_.has(param, 'format'))
					{
						format.columns = _.filter(format.columns, function (column)
						{
							var includeColumn = true;

							if (column.roles != undefined)
							{
								includeColumn = (column.roles.length == 0);
							}

							if (!includeColumn)
							{
								_.each(column.roles, function (role)
								{
									if (!includeColumn)
									{	
										includeColumn = entityos._util.user.roles.has({role: role, exact: true})
									}	
								});
							}

							return includeColumn
						});

						_.each(format.columns, function (column)
						{
							if (column.param == undefined) {column.param = column.property}
							if (column.param == undefined) {column.param = column.field}
							if (column.paramList == undefined) {column.paramList = column.properties}
							if (column.paramList == undefined) {column.paramList = column.fieldList}
							if (column.paramList == undefined) {column.paramList = column.fields}
						})
						
						var dataSort = entityos._util.data.get(
						{
							controller: 'util-view-table',
							context: context,
							valueDefault: {}
						});

						if (dataSort.direction != undefined && dataSort.name != 'undefined')
						{
							var columnSort = $.grep(format.columns, function (column) {return column.param == dataSort.name})[0];

							if (columnSort != undefined)
							{
								columnSort.sortDirection = dataSort.direction;
								sorts = [dataSort]
							}
						}

						if (response == undefined)
						{
							entityos._util.data.set(
							{
								scope: context,
								context: '_param',
								value: param
							});

							entityos._util.data.set(
							{
						        controller: 'util-view-table',
						        context: context,
						        value: {}
						    });

							if (fields == undefined)
							{
								var fields = $.map(format.columns, function (column)
								{
									return (column.param!=undefined?{name: column.param}:undefined)
								});

								_.each(format.columns, function (column)
								{
									if (_.isArray(column.paramList))
									{
										_.each(column.paramList, function (param)
										{
											fields.push({name: param})
										});
									}
								});
							}	

							if (sorts == undefined)
							{
								sorts = $.grep(format.columns, function (column)
								{
									return (column.defaultSort)
								});

								sorts = $.map(sorts, function (column)
								{
									var direction = 'asc';
									if (column.defaultSortDirection != undefined)
									{
										direction = column.defaultSortDirection;
									}

									return (column.param!=undefined?{name: column.param, direction: direction}:undefined)
								});
							}

							if (rows == undefined)
							{
								rows = (options.rows!=undefined ? options.rows : entityos._scope.app.options.rows);
							}

							var search = 
							{
								criteria:
								{
									fields: fields,
									filters: filters,
									customoptions: customOptions,
									options:
									{
										rows: rows
									},
									sorts: sorts
								}
							}

							var startRow = entityos._util.param.get(param, 'startRow').value;

							if (startRow != undefined)
							{
								search.criteria.options.startrow = startRow;
							}

							if (options.count == undefined)
							{
                                var countField = options.countField;
                                if (countField == undefined) {countField = 'id'};
                             
								search.criteria.summaryFields =
								[
									{
										name: 'count(' + countField + ') count'
									}
								]
							}		

							entityos.retrieve(
							{
								object: object,
								data: search,
								callback: callback,
								callbackParam: param,
								includeMetadata: options.includeMetadata,
								includeMetadataAdvanced: options.includeMetadataAdvanced,
								includeMetadataSnapshot: options.includeMetadataSnapshot,
                                includeMetadataGUID: options.includeMetadataGUID
							});
						}
						else // render
						{
							if (response.status == 'ER' && _.isFunction(options.onError))
							{
								options.onError(response.error)
							}
							else
							{
								var data = entityos._util.data.get(
								{
									scope: context,
									valueDefault: {}
								});

								if (options.count != undefined)
								{
									response.summary = {count: options.count}
								}

								var init = (_.eq(response.startrow, '0'));

								if (init)
								{
									if (format.row != undefined)
									{
										$.each(format.columns, function (c, column)
										{
											if (column.class == undefined) {column.class = format.row.class}
											if (column.data == undefined) {column.data = format.row.data}
										});
									}

									entityos._util.data.set(
									{
										scope: context,
										context: 'count',
										value: _.toNumber(response.summary.count)
									});
								}
								
								if (_.eq(entityos._scope.data[context].count, 0)) //nothing to show
								{
									var noDataText = options.noDataText;
									if (noDataText == undefined) {noDataText = 'No data'}

									var noDataClass = '';
									if (containerClass != undefined)
									{
										noDataClass = ' ' + containerClass
									}
									
									entityos._util.view.queue.show('#' + container, '<div class="text-muted mx-auto text-center entityos-no-data myds-no-data' + noDataClass + '">' + noDataText + '</div>', {queue: context});
								} 
								else
								{	
									if (format.row != undefined)
									{
										if (_.isFunction(format.row.method))
										{             
											_.each(response.data.rows, function (row, r)
											{
												row._index = r;

												row._previous = entityos._util.data.get(
												{
													controller: context,
													context: 'lastProcessedRow',
													clone: false
												});

												format.row.method(row);

												entityos._util.data.set(
												{
													scope: context,
													context: 'lastProcessedRow',
													value: row
												});
											});
										}

										if (!_.isUndefined(format.row.controller))
										{             
											_.each(response.data.rows, function (row, r)
											{
												row._index = r;

												row._previous = entityos._util.data.get(
												{
													scope: context,
													context: 'lastProcessedRow',
													clone: false
												});

												entityos._util.controller.invoke(format.row.controller, row)

												entityos._util.data.set(
												{
													scope: context,
													context: 'lastProcessedRow',
													value: row
												});
											});
										}
									}    

									if (init)
									{
										entityos._util.data.set(
										{
											scope: context,
											context: 'all',
											value: response.data.rows
										});
									}
									else
									{
										entityos._scope.data[context].all = _.concat(entityos._scope.data[context].all, response.data.rows);
									}

									var captions = $.map(format.columns, function (column)
									{
										return (column.caption != undefined ? {name: column.caption, class: column.class, sortBy: column.sortBy, param: column.param, sortDirection: column.sortDirection} : undefined)
									});

									if (init || options.orientation == 'horizontal')
									{
										entityos._util.view.queue.clear({queue: context});
									}

									if (init)
									{	
										//Row template construction
										
										if (options.noHeader)
										{
											var columns = $.grep(format.columns, function (column)
											{
												return (column.hidden != true)
											});
										}
										else
										{
											var columns = $.grep(format.columns, function (column)
											{
												return (column.caption != undefined)
											});
										}

										var html = [];

										html.push('<tr' + (format.row.class==undefined?'':' class="' + format.row.class + '"') + 
												(format.row.dataAll==undefined?' data-id={{id}}':' ' + format.row.dataAll) + '>');

										if (!_.isEmpty(select))
										{
											html.push('<td id="entityos-view-table-select-{{id}}-container"');

											if (select.containerClass != undefined)
											{
												html.push(' class="' + select.containerClass + '"');
											}

											if (select.type == undefined)
											{
												select.type = 'checkbox';
											}

											if (select.selectAll == undefined)
											{
												select.selectAll = (select.type == 'checkbox')
											}

											html.push('><input type="' + select.type + '" class="entityos-view-table-select myds-view-table-select');

											if (select.class != undefined)
											{
												html.push(' ' + select.class);
											}

											html.push('"');

											if (select.context != undefined)
											{
												html.push(' id="' + select.context + '-{{id}}"');
											}

											if (select.name != undefined)
											{
												html.push(' name="' + select.name + '"');
											}

											if (select.controller != undefined)
											{
												html.push(' data-controller="' + select.controller + '"');
											}

											if (select.scope != undefined)
											{
												html.push(' data-scope="' + select.scope + '"');
											}

											if (select.data != undefined)
											{
												html.push(' ' + select.data);
											}
											else if (format.row.data != undefined)
											{
												html.push(' ' + format.row.data);
											}

											if (select.selected)
											{
												html.push(' checked="checked"');
											}

											html.push('></td>');
										}

										_.each(columns, function (column, c)
										{
											if (column.html != undefined)
											{
												if (column.html.indexOf('<td') == -1)
												{
													html.push('<td class="' + column.class + '">' + column.html + '</td>');
												}
												else
												{
													html.push(column.html);
												}
											}
											else if (column.name != undefined || column.param != undefined)
											{
												var name = (column.name != undefined ? column.name : column.param);
												html.push('<td class="' + column.class + '"')

												if (column.data != undefined)
												{
													html.push(' ' + column.data);
												}

												html.push('>{{' + _.last(_.split(name, ' ')) + '}}</td>');
											}	
										});

										html.push('</tr>');

										if (options.containerController != undefined && options.containerController != '')
										{
											html.push('<tr id="' + options.containerController + '-{{id}}-container" class="collapse entityos-collapse myds-collapse" data-id="{{id}}"' +
											' data-controller="' + options.containerController + '" data-context="' +  context + '"' +
											(options.containerControllerData==undefined?'':' ' + options.containerControllerData) +
											'>' +
											'<td colspan="' + captions.length + '" id="' + options.containerController + '-{{id}}-container-view"></td></tr>')
										}

										entityos._util.view.queue.add(html.join(''), {type: 'template', queue: context});
									}

									if (init || options.orientation == 'horizontal')
									{
										//Header construction

										var rowsTotal = data.count;
										var rowsCurrent = data.all.length;
										var pageRows = options.rows;
										var pagesTotal = parseInt(_.toNumber(rowsCurrent) / _.toNumber(pageRows));
										var startRow = response.startrow;
										var currentPage = parseInt((_.toNumber(startRow) + _.toNumber(pageRows)) / _.toNumber(pageRows));
										var tableClass = (options.class!=undefined?options.class:'table-hover');

										if (options.header == undefined) {options.header = options.showHeader}
										var tableHeader = (options.header!=undefined?options.header:true);

										if (options.footer == undefined) {options.footer = options.showFooter}
										var tableFooter = (options.footer!=undefined?options.footer:true);

										entityos._util.data.set(
										{
											controller: context,
											context: 'pages',
											name: currentPage,
											value: {rows: response.data.rows.length}
										});

										if (response.error != undefined)
										{
											if (response.error.errorcode == 3)
											{
												if (entityos._scope.data['util-view-table'] != undefined)
												{
													var dataContext = entityos._scope.data['util-view-table'].dataContext;
													startRow = dataContext.start;
													pageRows = dataContext.rows;
													rowsCurrent = parseInt(_.toNumber(startRow) + _.toNumber(pageRows));
													rowsTotal = rowsCurrent;
													currentPage = parseInt(dataContext.page);
													pagesTotal = currentPage;

													var data = entityos._util.data.set(
													{
														controller: context,
														context: 'count',
														value: rowsTotal
													});

													response.startrow = startRow;
													response.moreid = dataContext.id;
													response.morerows = 'false';
													response.rows = pageRows;
												}
											}
										}
										
										entityos._util.view.queue.add('<div class="entityos-page-view myds-page-view" data-page="' + currentPage + '"', {queue: context});
										
										if (context != undefined)
										{
											entityos._util.view.queue.add(' data-context="' + context + '"', {queue: context})
										}

										entityos._util.view.queue.add('>', {queue: context});

										entityos._util.view.queue.add('<table class="table ' + tableClass + ' mb-0 m-b-0">', {queue: context});

										if (response.data.rows.length != 0)
										{
											if (_.size(captions) != 0 && tableHeader)
											{
												entityos._util.view.queue.add('<thead>', {queue: context});
												entityos._util.view.queue.add('<tr', {queue: context})

												if (controller != undefined)
												{
													entityos._util.view.queue.add(' data-controller="util-view-table"', {queue: context})
												}

												if (context != undefined)
												{
													entityos._util.view.queue.add(' data-context="' + context + '"', {queue: context})
												}

												if (format.header != undefined)
												{
													if (format.header.class != undefined)
													{
														entityos._util.view.queue.add(' class="' + format.header.class + '"', {queue: context})
													}
												}

												entityos._util.view.queue.add('>', {queue: context});

												if (!_.isEmpty(select))
												{
													entityos._util.view.queue.add('<th', {queue: context});

													if (select.containerClass != undefined)
													{
														entityos._util.view.queue.add(' class="' + select.containerClass + '"', {queue: context});
													}

													entityos._util.view.queue.add('>', {queue: context});

													if (select.selectAll != false)
													{
														entityos._util.view.queue.add('<input class="entityos-view-table-select-all myds-view-table-select-all', {queue: context});

														if (select.class != undefined)
														{
															entityos._util.view.queue.add(' ' + select.class + '"', {queue: context});
														}

														entityos._util.view.queue.add('" type="checkbox" id="' + context + '-select-all"' +
															' data-context="' + context + '"', {queue: context})

														if (select.selected)
														{
															entityos._util.view.queue.add(' checked="checked"', {queue: context});
														}

														if (select.controller != undefined)
														{
															entityos._util.view.queue.add(' data-controller="' + select.controller + '"', {queue: context});
														}

														entityos._util.view.queue.add('>', {queue: context});
													}
													else
													{
														entityos._util.view.queue.add(select.caption, {queue: context});
													}

													entityos._util.view.queue.add('</th>', {queue: context});
												}

												var captionClass;
												var captionData;

												$.each(captions, function (c, caption)
												{
													captionClass = '';
													captionData = ''

													if (caption.class != undefined)
													{
														captionClass = caption.class
													}

													if (caption.sortBy)
													{
														captionClass = captionClass + ' entityos-sort myds-sort';
														captionData = 'data-sort-direction="' +
																			(caption.sortDirection!=undefined?caption.sortDirection:'asc') + '" data-sort="' + caption.param + '"';
													}

													if (captionClass != '')
													{
														captionClass = 'class="' + captionClass + '"';
													}

													entityos._util.view.queue.add('<th ' + captionClass + ' ' + captionData + '>' + caption.name + '</th>', {queue: context});
												});

												entityos._util.view.queue.add('</tr></thead>', {queue: context});	
											}	
										}
									}

									var methodColumns = $.grep(format.columns, function (column)
									{
										return (column.method != undefined || column.controller != undefined)
									});

									var columnData;

									if (methodColumns.length != 0)
									{
										_.each(response.data.rows, function (row)
										{
											_.each(methodColumns, function (column)
											{
												if (column.name == undefined) {column.name = column.param}

												if (column.name != undefined)
												{
													if (typeof(column.method) == 'function')
													{
														row[column.name] = column.method(row)
													}

													if (typeof entityos._util.controller.code[column.controller] == 'function')
													{

														columnData = entityos._util.controller.invoke({name: column.controller}, column, row);
														if (columnData != undefined) {row[column.name] = columnData}
													}
												}
											});
										});
									}

									if (response.data.rows.length == 0)
									{
										entityos._util.view.queue.add('<tr><td class="text-center text-muted p-t-md p-b-md" colspan="' + captions.length + '">No more data</td></tr>', {queue: context});
									}
									else
									{
										_.each(response.data.rows, function (row)
										{
											entityos._util.view.queue.add({useTemplate: true, queue: context}, row);
										});
									}
									
									if (init || options.orientation == 'horizontal')
									{
										entityos._util.view.queue.add('</table></div>', {queue: context})
									}

									if (init)
									{
										entityos._util.view.queue.add('<div id="' + controller + '-navigation" class="mx-auto w-50"></div>', {queue: context})
									}

									if (options.orientation == 'horizontal')
									{
										$('#' + container + ' div.entityos-page-view, #' + container + ' div.myds-page-view').hide()
									}

									var append = !init;
									var appendSelector = (options.orientation=='horizontal'?'div.entityos-page-view:last':'table tr:last');

									entityos._util.view.queue.render('#' + container, {append: append, queue: context, appendSelector: appendSelector}, data);

									if (containerClass != undefined)
									{
										$('#' + container).addClass(containerClass);
									}

									entityos._util.view.more(_.omit(response, 'data'),
									{
										queue: context,
										controller: 'util-view-table',
										context: context,
										orientation: options.orientation,
										rows: pageRows,
										rowsSelections: options.rowsSelections,
										progressive: options.progressive,
										containerID: controller + '-navigation',
										showAlways: options.showAlways,
										showFooter: tableFooter
									});
								}

								if (_.has(options, 'deleteConfirm') && context != undefined)
								{
									if (typeof $.fn.popover == 'function')
									{
										$('#' + container + ' .entityos-delete, #' + container + ' .myds-delete').each(function (b, button)
										{
											var content = '<div class="text-center">' + options.deleteConfirm.text + '</div>' +
												  	'<div class="text-center mt-3 mb-2 m-t m-b">' +
												  	'<button type="button" class="btn btn-link text-muted entityos-close myds-close" data-context="popover">Cancel</button>' +
												  	'<button type="button" class="btn btn-danger btn-outline entityos-click myds-close myds-click myds-close"' +
												  		' data-context="popover"' +
												  		' data-controller="' + (_.isUndefined(options.deleteConfirm.controller)?context + '-delete-ok':options.deleteConfirm.controller) + '"' +
												  		' data-id="' + $(button).attr('data-id') + '"' +
                                                        (_.isUndefined(options.deleteConfirm.data)?'':' ' + options.deleteConfirm.data) +
												  	'>' + (_.isUndefined(options.deleteConfirm.buttonText)?'Delete':options.deleteConfirm.buttonText) + '</button>' +
												  	'</div>';

											$(button).popover(
											{
												title: (_.isUndefined(options.deleteConfirm.headerText)?'Delete':options.deleteConfirm.headerText),
												content: content,
												html: true,
												placement: (_.isUndefined(options.deleteConfirm.position)?'left':options.deleteConfirm.position),
												sanitize: false
											});
										});
									}
									else if (typeof $.fn.popConfirm == 'function')
									{
										$('#' + container + ' .entityos-delete').popConfirm(
										{
											title: (_.isUndefined(options.deleteConfirm.headerText)?'Delete':options.deleteConfirm.headerText),
											content: options.deleteConfirm.text,
											placement: (_.isUndefined(options.deleteConfirm.position)?'left':options.deleteConfirm.position),
											controller: (_.isUndefined(options.deleteConfirm.controller)?context + '-delete-ok':options.deleteConfirm.controller),
											id: -1,
											sanitize: false
										});
									}
								}

								entityos._util.data.set(
								{
									scope: 'util-view-table-cache',
									context: context,
									value: $('#' + container).html()
								});

								entityos._util.data.set(
								{
									scope: 'util-view-table',
									context: context,
									name: 'paging',
									value:
									{
										pagesTotal: pagesTotal,
										pageRows: pageRows,
										rowsTotal: rowsTotal,
										rowsCurrent: rowsCurrent,
										startRow: startRow,
										id: response.moreid
									}
								});

								if (options.orientation == 'horizontal' && !options.progressive && goToPageWhenCan && goToPageNumber == undefined)
								{
									var dataStatus = entityos._util.data.get(
									{
										scope: 'util-view-table',
										context: context
									});

									if (_.has(dataStatus, 'currentPage'))
									{
										if (currentPage != dataStatus.currentPage)
										{
											goToPageNumber = dataStatus.currentPage
										}
									}
								}

								if (goToPageNumber != undefined && goToPageNumber != 1)
								{
									entityos._util.view.showPage(
									{
										id: response.moreid,
										context: context,
										controller: "util-view-table",
										number: goToPageNumber,
										pages: pagesTotal,
										rows: pageRows,
										showPages: pagesTotal,
										showPagesMaximum: pagesTotal,
										startrow: (numeral(goToPageNumber).value() - 1) * numeral(pageRows).value()
									})
								}
								else
								{
									if (!keepHidden)
									{
										$('#' + container).removeClass('hidden d-none');
									}

									entityos._util.data.set(
									{
										scope: 'util-view-table',
										context: context,
										name: 'currentPage',
										value: currentPage
									});

									entityos._util.data.set(
									{
										scope: 'util-view-table',
										context: context,
										name: 'currentPage',
										value: currentPage
									});

									if (param.onComplete == undefined)
									{
										param.onComplete = data._param.onComplete
									}

									entityos._util.onComplete({onComplete: param.onComplete});
								}
							}
						}
					}
				}	
			}
		}
	});

	entityos._util.controller.add(
	{
		name: 'util-view-modal',
		code: function (param)
		{
			var html = entityos._util.param.get(param, 'html').value;

			if ($('#entityos-modal').length == 0)
			{
				$('#wrapper').append('<div id="entityos-modal"></div>');
			}

			var htmlModal = '<div class="modal" id="util-view-modal-view">' +
							  	html +
							   '</div>' +
							'</div>';

			$('#entityos-modal').html(htmlModal)
			$('#util-view-modal-view').modal()
		}
	});

	entityos._util.controller.add(
	{
		name: 'util-view-tab-show',
		code: function (target, param)
		{
			if (target != undefined)
			{
				if (!_.startsWith(target, '#'))
				{
					target = '#' + target;
				}

				$('a[href="' + target + '"]').tab('show');
			}
		}
	});
	
	entityos._util.controller.add(
	[
		{
			name: 'util-local-cache-save',
			code: function (param, response)
			{
				var key = entityos._util.param.get(param, 'key').value;
				var persist = entityos._util.param.get(param, 'persist', {"default": false}).value;
				var storage = (persist?localStorage:sessionStorage);
				var data = entityos._util.param.get(param, 'data').value;

				if (typeof data !== 'string')
				{
					data = JSON.stringify(data);
				}

				storage.setItem(key, data);

				entityos._util.onComplete(param);
			}
		},
		{
			name: 'util-local-cache-search',
			code: function (param, response)
			{
				var key = entityos._util.param.get(param, 'key').value;
				var persist = entityos._util.param.get(param, 'persist', {"default": false}).value;
				var storage = (persist?localStorage:sessionStorage);
				var isJSON = entityos._util.param.get(param, 'isJSON', {"default": key.toLowerCase().indexOf('.json') != -1}).value;
				var onComplete = entityos._util.param.get(param, 'onComplete').value;

				var data = storage.getItem(key);

				if (data == null) {data = undefined}

				if (isJSON && data !== undefined)
				{
					data = JSON.parse(data);
				}

				if (onComplete != undefined)
				{
					param = entityos._util.param.set(param, 'data', data);
					entityos._util.onComplete(param);
				}
				else
				{
					return data;
				}
			}
		},
		{
			name: 'util-local-cache-remove',
			code: function (param, response)
			{
				var key = entityos._util.param.get(param, 'key').value;
				var persist = entityos._util.param.get(param, 'persist', {"default": false}).value;
				var storage = (persist?localStorage:sessionStorage);
				var all = entityos._util.param.get(param, 'all', {"default": false}).value;

				if (all)
				{
					storage.clear()
				}
				else
				{
					storage.removeItem(key);
				}	

				entityos._util.onComplete(param);
			}
		},
		{
			name: 'util-local-cache-source-refresh',
			code: function (param, response)
			{
				var filename = entityos._util.param.get(param, 'filename').value;
				var url = entityos._util.param.get(param, 'url').value;
				
				if (filename != undefined)
				{
					url = window.location.origin + '/site';

					if (entityos._scope.app.site != undefined)
					{
						url += '/' + entityos._scope.app.site
					}

					url += '/' + filename
				}

				if (url != undefined)
				{
					fetch(url,
					{
					  "referrer": window.location.href,
					  "referrerPolicy": "strict-origin-when-cross-origin",
					  "body": null,
					  "method": "GET",
					  "mode": "cors",
					  "credentials": "omit",
					  "cache": "reload"
					});
				}

				entityos._util.onComplete(param);
			}
		}
	]);

    entityos._util.controller.add(
    {
        name: 'util-cloud-log-save',
        code: function (param, response)
        {            
            var message;
            var data;

            if (response == undefined)
            {
                if (_.isString(param))
                {
                    message = param
                }
                else
                {
                    message = entityos._util.param.get(param, 'message').value;
                    data = entityos._util.param.get(param, 'data').value;
    
                    if (_.isObject(data))
                    {
                        data = JSON.stringify(data)
                    }
                }
    
                if (message != undefined || data != undefined)
                {
                    entityos.cloud.save(
                    {
                        object: 'core_debug_log',
                        fields:
                        {
                            data: data,
                            notes: message
                        },
                        callback: 'util-cloud-log-save',
                        callbackParam: param
                    });
                }
            }
            else
            {
                entityos._util.onComplete(param);
            }
        }
    });

    entityos._util.controller.add(
    [
        {
            name: 'util-space-is-switched',
            code: function (param)
            {
                return entityos.space.isSwitched(param);
            }
        },
        {
            name: 'util-space-whoami',
            code: function (param)
            {
                return entityos.space.whoAmI(param);
            }
        },
        {
            name: 'util-space-switch-into',
            code: function (param)
            {
                var scope = entityos._util.param.get(param, 'scope', {default: 'util-space-switch-into'}).value;
                var data = entityos._util.data.get({scope: scope});
                param = _.assign(param, {id: data.id});

                entityos.space.switchInto(param);
            }
        },
        {
            name: 'util-space-switch-back',
            code: function (param)
            {
                entityos.space.switchBack(param);
            }
        }
    ]);

    entityos._util.controller.add(
    {
        name: 'util-view-notify-hide',
        code: function (param)
        {
            entityos._util.view.hide({toast: true})
        }
    });

    entityos._util.controller.add(
    {
        name: 'util-get-ids',
        code: function (param, response)
        {
            var field = entityos._util.param.get(param, 'field', {default: 'id'}).value;
            var data = entityos._util.param.get(param, 'data', {default: []}).value;
            var defaultIDs = entityos._util.param.get(param, 'default').value;
            var ids = _.filter(_.map(data, field), function (dataID) {return dataID != ''});

            if (ids.length == 0)
            {
                ids = defaultIDs
            }
            else
            {
                ids = _.join(ids, ',');
            }

            return ids
        }
    });

    entityos._util.controller.add(
    {
        name: 'util-whencan-invoke',
        code: function (param)
        {
            entityos._util.whenCan.invoke(param)
        }
    });

    entityos._util.controller.add(
    {
        name: 'util-param-get',
        code: function (param, data)
        {
            if (_.isString(param))
            {
                param = {name: param}
            }

            return entityos._util.param.get(data, param.name, param.options).value;
        }
    });

    entityos._util.controller.add(
    {
        name: 'util-param-set',
        code: function (param, data)
        {
            if (!_.isPlainObject(param))
            {
                param = {}
            }

            return entityos._util.param.set(data, param.name, param.value);
        }
    });

    entityos._util.controller.add(
    {
        name: 'util-cloud-search-show',
        code: function (param, response)
        {            
            if (response == undefined)
            {
                var search = _.assign(
                {
                    callbackParam: param,
                    callback: 'util-cloud-search-show'
                },
                param);
                entityos.cloud.search(search);
            }
            else
            {
                if (response.status == 'ER')
                {
                     console.log('!! ERROR; ' + response.error.errornotes)
                }
                else
                {
                    var data = response.data.rows;

                    if (data.length == 0)
                    {
                         console.log('NO DATA')
                    }
                    else
                    {
                        if (param.asTable)
                        {
                            console.table(data);
                        }
                        else
                        {
                            param.fields.push('id');

                            var log = [_.join(param.fields, ',')];
                            var table = []

                            _.each(data, function (_data)
                            {
                                var _log = [];
                                var _table = {};

                                _.each(param.fields, function (field)
                                {
                                    _log.push(_data[field]);
                                    _table[field] = _data[field]
                                });
                                
                                log.push(_.join(_log, ','))
                                table.push(_table)
                            })

                            console.table(table);
                            console.log(_.join(log, '\r\n'));

                        }
                       
                    }
                }
            }
        }
    });

	if (_.isObject(window.app))
	{
		app._util = entityos._util;
		app.invoke = entityos._util.controller.invoke;
		app.add = entityos._util.controller.add;
		app.find = entityos._util.data.find;
		app.set = entityos._util.data.set;
		app.get = entityos._util.data.get;
		app.refresh = entityos._util.view.refresh;
		app.vq = entityos._util.view.queue;
		app.show = entityos._util.view.queue.show;
	}

	_.mixin(
	{
		VERSION: entityos._scope.app.options.version,
		appInvoke: entityos._util.controller.invoke,
		appAdd: entityos._util.controller.add,
		appParamSet: entityos._util.param.set,
		appParamGet: entityos._util.param.get,
		isNotSet: entityos._util.isNotSet,
		isSet: entityos._util.isSet
	});

	if (_.isObject(s))
	{
		if (_.isFunction(s.unescapeHTML))
		{
			_.unescapeHTML = s.unescapeHTML;
		}
	}

	_.each(
	[
		'export',
		'import',
		'local',
		'queryLanguage',
		'dashboard',
		'security',
		'search',
		'editor',
		'chart',
		'calendar',
		'financial',
		'protect'
	], function (namespace)
	{
		if (_.isFunction(entityos._util.factory[namespace]))
		{
			entityos._util.factory[namespace](param)
		}
	});
}