var profile = (function(){
	var testResourceRe = /^rcbc\/tests\//;
	var copyOnly = function(filename, mid){
		var list = {};
		return (mid in list) || /\.(png|jpg|jpeg|gif|tiff|css|less)$/.test(filename);
	};
	
	var excludes = [
	];

	var excludesRe = new RegExp(("^lib/(" + excludes.join("|") + ")").replace(/\//, "\\/"));

	var usesDojoProvideEtAl = function(mid){
		return excludesRe.test(mid);
	};
	
    return {
        resourceTags: {
			test: function(filename, mid){
				return testResourceRe.test(mid);
			},
            amd: function(filename, mid) {
                //return !testResourceRe.test(mid) && !copyOnly(filename, mid) && !usesDojoProvideEtAl(mid) && /\.js$/.test(filename);
				return !testResourceRe.test(mid) && !copyOnly(filename, mid) && /\.js$/.test(filename);
            },
			copyOnly: function(filename, mid){
				return copyOnly(filename, mid) || /\.js\.uncompressed\.js/.test(filename);
			},
			declarative: function(filename, mid) {
                return /\.html$/.test(filename);
            }
        },
    };
})();