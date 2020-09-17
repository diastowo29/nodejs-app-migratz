const axios = require('axios');
require('./base')
const { tfieldsTable } = require('./sequelizer');
const { Op } = require("sequelize");

var zd_ticketforms_api = '/api/v2/ticket_forms'

var fieldsDestApi = `${generateApi(destDomain)}${zd_ticketforms_api}.json`;

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
        response.data.ticket_forms.forEach(ticket_form => {
            var urlDelete = `${generateApi(destDomain)}${zd_ticketforms_api}/${ticket_form.id}.json`;
            console.log(urlDelete)
            axios({
                method: 'DELETE',
                url: urlDelete,
                auth: {
                    username: destUsername,
                    password: destPassword
                }
            }).then(function (deleteResponse) {
                console.log(deleteResponse.status)
            }).catch(function (error) {
                console.log(error.response.data.details)
                console.log('ERROR: delete form: %s error', ticket_form.name)
            })
        });
    });
}

function generateApi (domain) {
    return 'https://' + domain + '.zendesk.com';
}