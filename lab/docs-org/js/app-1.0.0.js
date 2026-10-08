
$(function()
{
  
	if (window.location.protocol == 'http:')
	{
		window.location.href = window.location.href.replace('http', 'https')
	}
	else
	{	
        $('.smoothscroll').on('click', function (e) {
            var target = this.hash,
            $target    = $(target);
            
                e.preventDefault();
                e.stopPropagation();

            $('html, body').stop().animate({
                'scrollTop': $target.offset().top
            }, 800, 'swing').promise().done(function () {

                window.location.hash = target;
            });
        });

        window.app =
        {
            controller: entityos._util.controller.code,
            vq: entityos._util.view.queue,
            get: entityos._util.data.get,
            set: entityos._util.data.set,
            invoke: entityos._util.controller.invoke,
            add: entityos._util.controller.add,
            show: entityos._util.view.queue.show
        };

        entityos._util.controller.invoke('app-open-source-projects-init');
    }
});

entityos._util.controller.add(
{
    name: 'app-open-source-projects-init',
    code: function ()
    {
        $.ajax(
        {
            type: 'GET',
            url: 'https://raw.githubusercontent.com/ProofOfCardano/Projects/main/projects.json',
            cors: false,
            dataType: 'json',
            success: function(data)
            {
                var projectsView = app.vq.init({queue: 'projects-view'});

                var projects = data.projects;
                projects = _.sortBy(projects, 'title'.toLowerCase());

                projectsView.add('<div class="row">');

                _.each(projects, function (project)
                {
                    project.url = 'https://github.com/' + project.owner;

                    if (_.isArray(project.names))
                    {
                        if (project.names.length == 1)
                        {
                            project.url += '/' + _.first(project.names);
                        }
                    }

                    projectsView.add(
                    [
                        '<div class="col-4 py-2"><a href="', project.url, '" target="_blank">', project.title, '</a></div>'
                    ]);
                });

                projectsView.add('</div>');

                projectsView.render('#proofofcardano-projects-view');
            
            },
            error: function (data) {}			
        });
    }
});