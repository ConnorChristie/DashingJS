import express = require('express');
import http = require('http');
import io = require('socket.io');
import path = require('path');
import config = require('./config');

var app = express();
var httpServer = http.createServer(app);
var ioServer = io(httpServer);

var visitorsData = {};

app.set('port', (process.env.PORT || 5000));

app.use(express.static(path.join(__dirname, 'public/')));

app.get(/\/(about|contact)?$/, function (req, res)
{
	res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.get('/dashboard', function (req, res)
{
	res.sendFile(path.join(__dirname, 'views/dashboard.html'));
});

ioServer.on('connection', function (socket)
{
	if (socket.handshake.headers.host === config.host
		&& socket.handshake.headers.referer.indexOf(config.host + config.dashboardEndpoint) > -1)
	{
		ioServer.emit('updated-stats', computeStats());
	}
	
	socket.on('visitor-data', function (data)
	{
		visitorsData[socket.id] = data;
		
		ioServer.emit('updated-stats', computeStats());
	});

	socket.on('disconnect', function ()
	{
		delete visitorsData[socket.id];
		
		ioServer.emit('updated-stats', computeStats());
	});
});

function computeStats()
{
	return {
		pages: computePageCounts(),
		referrers: computeRefererCounts(),
		activeUsers: getActiveUsers()
	};
}

function computePageCounts()
{
	var pageCounts = {};
	for (var key in visitorsData)
	{
		var page = visitorsData[key].page;
		if (page in pageCounts)
		{
			pageCounts[page]++;
		} else
		{
			pageCounts[page] = 1;
		}
	}
	return pageCounts;
}

function computeRefererCounts()
{
	var referrerCounts = {};
	for (var key in visitorsData)
	{
		var referringSite = visitorsData[key].referringSite || '(direct)';
		if (referringSite in referrerCounts)
		{
			referrerCounts[referringSite]++;
		} else
		{
			referrerCounts[referringSite] = 1;
		}
	}
	return referrerCounts;
}

function getActiveUsers()
{
	return Object.keys(visitorsData).length;
}

httpServer.listen(app.get('port'), function ()
{
	console.log('listening on *:' + app.get('port'));
});
