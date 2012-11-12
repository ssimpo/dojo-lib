// summary:
//      Class to detect flash version.
// note:
//      Written by Carl S. Yestrau and edited for Dojo by Stephen Simpson.
// author:
//      Carl S. Yestrau
//      Stephen Simpson <me@simpo.org> <http://simpo.org/>
// copyright:
//      Copyright (c) 2007, Carl S. Yestrau All rights reserved.
// license:
//      BSD License: http://www.featureblend.com/license.txt
define(["dojo/_base/declare"], function(declare){
    
    var construct = declare("lib.flashDetect",null,{
        'installed':false,
        'raw':"",
        'major':-1,
        'minor':-1,
        'revision':-1,
        'revisionStr':"",
        '_activeXDetectRules':[
            {
                "name":"ShockwaveFlash.ShockwaveFlash.7",
                "version":function(obj,self){
                    return self.getActiveXVersion(obj);
                }
            },{
                "name":"ShockwaveFlash.ShockwaveFlash.6",
                "version":function(obj,self){
                    var version = "6,0,21";
                    try{
                        obj.AllowScriptAccess = "always";
                        version = self.getActiveXVersion(obj);
                    }catch(err){}
                    return version;
                }
            },{
                "name":"ShockwaveFlash.ShockwaveFlash",
                "version":function(obj,self){
                    return self.getActiveXVersion(obj,self);
                }
            }
        ],
        JS_RELEASE:"1.0.4",
        
        constructor: function() {
            // summary:
            //      Constructor.
            // description:
            //      Constructor, sets raw, major, minor, revisionStr, revision
            //      and installed public properties.
            
            if(navigator.plugins && navigator.plugins.length>0){
                var type = 'application/x-shockwave-flash';
                var mimeTypes = navigator.mimeTypes;
                if(mimeTypes && mimeTypes[type] && mimeTypes[type].enabledPlugin && mimeTypes[type].enabledPlugin.description){
                    var version = mimeTypes[type].enabledPlugin.description;
                    var versionObj = this.parseStandardVersion(version);
                    this.raw = versionObj.raw;
                    this.major = versionObj.major;
                    this.minor = versionObj.minor; 
                    this.revisionStr = versionObj.revisionStr;
                    this.revision = versionObj.revision;
                    this.installed = true;
                }
            }else if(navigator.appVersion.indexOf("Mac")==-1 && window.execScript){
                var version = -1;
                for(var i=0; i<this._activeXDetectRules.length && version==-1; i++){
                    var obj = this.getActiveXObject(this._activeXDetectRules[i].name,this);
                    if(!obj.activeXError){
                        this.installed = true;
                        version = this._activeXDetectRules[i].version(obj,this);
                        if(version!=-1){
                            var versionObj = this.parseActiveXVersion(version);
                            this.raw = versionObj.raw;
                            this.major = versionObj.major;
                            this.minor = versionObj.minor; 
                            this.revision = versionObj.revision;
                            this.revisionStr = versionObj.revisionStr;
                        }
                    }
                }
            }
        },
        
        getActiveXVersion: function(activeXObj) {
            // summary:
            //      Extract the ActiveX version of the plugin.
            // activeXObj: object
            //      The flash ActiveX object.
            // returns: string
            
            var version = -1;
            try{
                version = activeXObj.GetVariable("$version");
            }catch(err){}
            return version;
        },
        
        getActiveXObject:function(name) {
            // summary:
            //      Try and retrieve an ActiveX object having a specified name.
            // name: string
            //      The name The ActiveX object name lookup.
            // returns: object
            //      One of ActiveX object or a simple object having an attribute
            //      of activeXError with a value of true.
            
            var obj = -1;
            try{
                obj = new ActiveXObject(name);
            }catch(err){
                obj = {activeXError:true};
            }
            return obj;
        },
        
        parseActiveXVersion:function(str) {
            // summary:
            //      Parse an ActiveX $version string into an object.
            // str: string
            //      The ActiveX Object GetVariable($version) return value.
            // returns: object
            //      An object having raw, major, minor, revision and
            //      revisionStr attributes.
            
            var versionArray = str.split(",");//replace with regex
            return {
                "raw":str,
                "major":parseInt(versionArray[0].split(" ")[1], 10),
                "minor":parseInt(versionArray[1], 10),
                "revision":parseInt(versionArray[2], 10),
                "revisionStr":versionArray[2]
            };
        },
        
        parseStandardVersion:function(str) {
            // summary:
            //      Parse a standard enabledPlugin.description into an object.
            // str: string
            //      The enabledPlugin.description value.
            // returns: object
            //      An object having raw, major, minor, revision and revisionStr attributes.
            
            var descParts = str.split(/ +/);
            var majorMinor = descParts[2].split(/\./);
            var revisionStr = descParts[3];
            return {
                "raw":str,
                "major":parseInt(majorMinor[0], 10),
                "minor":parseInt(majorMinor[1], 10), 
                "revisionStr":revisionStr,
                "revision":this.parseRevisionStrToInt(revisionStr)
            };
        },
        
        parseRevisionStrToInt: function(str) {
            // summary:
            //      Parse the plugin revision string into an integer.
            // str: string
            //      The revision in string format.
            // returns: integer
            
            return parseInt(str.replace(/[a-zA-Z]/g, ""), 10) || this.revision;
        },
        
        majorAtLeast: function(version) {
            // summary:
            //      Is the major version greater than or equal to a
            //      specified version.
            // version: integer
            //      The minimum required major version.
            // returns: boolean
            
            return this.major >= version;
        },
        
        minorAtLeast: function(version) {
            // summary:
            //      Is the minor version greater than or equal to a
            //      specified version.
            // version: integer
            //      The minimum required minor version.
            // returns: boolean
            
            return this.minor >= version;
        },
        
        revisionAtLeast: function(version) {
            // summary:
            //      Is the revision version greater than or equal to a
            //      specified version.
            // version: integer
            //      The minimum required revision version.
            // returns: boolean
            
            return this.revision >= version;
        },
        
        versionAtLeast: function(major){
            // summary:
            //      Is the version greater than or equal to a specified major,
            //      minor and revision.
            // major: integer
            //      The minimum required major version.
            // minor: integer (otional)
            //      The minimum required minor version.
            // revision: integer (optional)
            //      The minimum required revision version.
            // returns: boolean
            
            var properties = [this.major, this.minor, this.revision];
            var len = Math.min(properties.length, arguments.length);
            for(i=0; i<len; i++){
                if(properties[i]>=arguments[i]){
                    if(i+1<len && properties[i]==arguments[i]){
                        continue;
                    }else{
                        return true;
                    }
                }else{
                    return false;
                }
            }
        }
    });
    
    return construct;
});