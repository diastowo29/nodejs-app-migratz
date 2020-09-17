const axios = require('axios');
require('./base')

var zd_tickets_api = '/api/v2/tickets.json'

var fieldsDestApi = generateApi(destDomain) + zd_tickets_api;

var counter = 0;

collectFieldsList();

function collectFieldsList () {
    axios({
        method: 'GET',
        url: fieldsDestApi,
        auth: {
            username: destUsername,
            password: destPassword
        }
    }).then(function (response) {
        console.log(response.status)
        console.log(response.data.tickets.length)
    });
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}