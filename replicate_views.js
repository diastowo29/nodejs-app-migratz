const axios = require('axios');
require('./base')
const { viewTable, groupTable, tfieldsTable, tformsTable } = require('./sequelizer');

var zd_views_api = '/api/v2/views.json'

var viewsOldApi = generateApi(originDomain) + zd_views_api;
var viewsNewApi = generateApi(destDomain) + zd_views_api;

collectViewsList();
var counter = 0;

function collectViewsList () {
    console.log('GETTING VIEWS LIST');
    axios({
        method: 'GET',
        url: viewsOldApi,
        auth: {
            username: originUsername,
            password: originPassword
        }
    }).then(function (response) {
        console.log('GET TOTAL %s VIEWS, MAPPING to DB', response.data.views.length)
        var createCount = 0;
        response.data.views.forEach(async view => {
            // console.log(view.title);
            const [viewData, created] = await viewTable.findOrCreate({
                where: {
                    old_view_id: view.id
                },
                defaults: {
                    old_view_name: view.title,
                    new_view_id: 0,
                    view_json: JSON.stringify(view)
                }
            });
            if (created) {
                createCount++;
            }
            counter++;
            if (counter == response.data.views.length) {
                console.log('MAPPING DONE');
                manipulateView();
            }
        });
    });
}

function manipulateView () {
    viewTable.findAll({
        where: {
            new_view_id: 0
        }
    }).then(viewZero => {
        viewZero.forEach(view => {
            /* SAMPE SINI DULU YAH GAN */
            // console.log(view.dataValues.old_view_name);
        });
    })
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}