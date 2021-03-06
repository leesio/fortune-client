'use strict';
var _ = require('lodash');

function getLinkedResources(primaryName, linkName, body){
  var path = primaryName + '.' + linkName;
  var type = body.links[path] && body.links[path].type;
  return type && body.linked && body.linked[type];
}

function rebaseLinks(links, top, next){
  return _.reduce(links, function(memo, value, key){
    if (key.indexOf(top) !== 0) return memo;
    var subtype = links[top + '.' + next].type;
    var subkey = key.replace(new RegExp(top + '.\\w+'), subtype);
    if (subkey.indexOf('.') !== -1) memo[subkey] = value;
    return memo;
  }, {});
}

exports._rebaseLinks = rebaseLinks;
exports._getLinkedResources = getLinkedResources;
exports.denormalize = function(config, res){
  var body = res.body;
  var primary = config.resource;
  if (config.request.denormalize){
    denormalizeLayer(body, primary);
  }
  function denormalizeLayer(body, primary){
    _.each(body[primary], function(primaryDoc){
      primaryDoc.links = _.reduce(_.keys(primaryDoc.links), function(memo, linkName){
        var linkedResources = getLinkedResources(primary, linkName, body);
        if (linkedResources){
          var rebased = rebaseLinks(body.links, primary, linkName);
          if (!_.isEmpty(rebased)){
            var nextPrimary = _.keys(rebased)[0].match(/\w+/)[0];
            var nextBody = {};
            nextBody.links = rebased;
            nextBody[nextPrimary] = body.linked[nextPrimary];
            nextBody.linked = _.extend({}, _.omit(body.linked, nextPrimary));
            nextBody.linked[primary] = body[primary];
            denormalizeLayer(nextBody, nextPrimary);
          }
          var match =  _.filter(linkedResources, function(r){
            return primaryDoc.links[linkName].indexOf(r.id) !== -1;
          });
          memo[linkName] = _.isArray(primaryDoc.links[linkName]) ? match : match[0];
        }else{
          memo[linkName] = primaryDoc.links[linkName];
        }
        return memo;
      }, {});
    });
  }
};