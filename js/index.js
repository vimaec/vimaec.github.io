/*
    VIM 3D WebGL Viewer
    Copyright VIMaec LLC, 2020
    Copyright Ara 3D, 2018
    Licensed under the terms of the MIT License

    A simple and easy to use 3D Model Web-Viewer built with Three.JS that eliminates a lot of boilerplate.
    This is based on a combination of examples from the Three.JS web-site.

    Example usage:

        <html>
        <head>
        <title>Simple VIM Viewer Example</title>
        </head>
        <script src="../dist/vim-3d-viewer.js"></script>
        <body>
        </body>
        <script>
            vim3d.view({ url: './dragon.ply' });
        </script>
        </html>
*/
// Used to provide new IDs for each new property descriptor that is created.
var gid = 0;
/**
 * Describes a property so that it can be found
 */
var PropDesc = /** @class */ (function () {
    function PropDesc(type, def) {
        this.type = type;
        this.def = def;
        this.id = gid++;
        this.name = "";
        this.vis = true;
    }
    PropDesc.prototype.setStep = function (step) {
        this.step = step;
        return this;
    };
    PropDesc.prototype.setRange = function (min, max) {
        this.min = min;
        this.max = max;
        return this;
    };
    PropDesc.prototype.setName = function (name) {
        this.name = name;
        return this;
    };
    PropDesc.prototype.setChoices = function (xs) {
        this.choices = xs;
        return this;
    };
    PropDesc.prototype.setOptions = function (xs) {
        this.options = xs;
        return this;
    };
    return PropDesc;
}());
/**
 * Holds a value, and a reference to the descriptor.
 */
var PropValue = /** @class */ (function () {
    function PropValue(_desc) {
        this._desc = _desc;
        this._value = _desc.def;
    }
    Object.defineProperty(PropValue.prototype, "name", {
        get: function () { return this._desc.name; },
        enumerable: true,
        configurable: true
    });
    ;
    Object.defineProperty(PropValue.prototype, "value", {
        get: function () { return this._value; },
        set: function (value) { this._value = value; },
        enumerable: true,
        configurable: true
    });
    return PropValue;
}());
/**
 * A list of properties. The values can be get and set directly on this object.
 */
var PropList = /** @class */ (function () {
    function PropList(desc, name) {
        if (name === void 0) { name = ''; }
        this.desc = desc;
        this.name = name;
        this.items = [];
        for (var k in desc) {
            var v = desc[k];
            if (v instanceof PropDesc)
                this.items.push(new PropValue(v));
            else
                this.items.push(new PropList(v, k));
        }
    }
    PropList.prototype.fromJson = function (json) {
        for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
            var pv = _a[_i];
            if (pv.name in json) {
                var v = json[pv.name];
                if (pv instanceof PropValue)
                    pv.value = v;
                else
                    pv.fromJson(v);
            }
        }
        return this;
    };
    Object.defineProperty(PropList.prototype, "toJson", {
        get: function () {
            var r = {};
            for (var _i = 0, _a = this.items; _i < _a.length; _i++) {
                var pv = _a[_i];
                if (pv instanceof PropValue) {
                    r[pv.name] = pv.value;
                }
                else {
                    r[pv.name] = pv.toJson;
                }
            }
            return r;
        },
        enumerable: true,
        configurable: true
    });
    PropList.prototype.find = function (name) {
        return this.items.find((v) => v.name === name );
    };
    return PropList;
}());
/**
 * Fills out a dat.gui instance to a property list.
 */
function bindControls(list, gui, onChange) {
    for (var k in list.desc) {
        bindControl(list, k, gui, onChange);
    }
    return gui;
}
/**
 * Fills out a dat.gui control to a property in a property list.
 */
function bindControl(list, name, gui, onChange) {
    var pv = list.find(name);
    if (!pv)
        throw new Error("Could not find parameter " + name);
    // Do I really need to pass a PropDesc?? 
    if (pv instanceof PropValue) {
        var desc = pv._desc;
        if (desc.choices) {
            return gui.add(pv, "value", desc.choices).name(pv.name).setValue(pv.value).onChange(function () { return onChange(pv); });
        }
        else if (desc.type === 'vec3') {
            var folder = gui.addFolder(desc.name);
            folder.open();
            folder.add(pv.value, "x").step(0.1).onChange(function () { return onChange(pv); });
            folder.add(pv.value, "y").step(0.1).onChange(function () { return onChange(pv); });
            folder.add(pv.value, "z").step(0.1).onChange(function () { return onChange(pv); });
            return folder;
        }
        else if (desc.type === 'hsv') {
            var folder = gui.addFolder(desc.name);
            folder.open();
            folder.add(pv.value, "x").name("hue").step(0.1).onChange(function () { return onChange(pv); });
            folder.add(pv.value, "y").name("saturation").step(0.1).onChange(function () { return onChange(pv); });
            folder.add(pv.value, "z").name("value").step(0.1).onChange(function () { return onChange(pv); });
            return folder;
        }
        else if (desc.type === 'rot') {
            var folder = gui.addFolder(desc.name);
            folder.open();
            folder.add(pv.value, "yaw", -1, 1, 0.01).onChange(function () { return onChange(pv); });
            folder.add(pv.value, "pitch", -1, 1, 0.01).onChange(function () { return onChange(pv); });
            folder.add(pv.value, "roll", -1, 1, 0.01).onChange(function () { return onChange(pv); });
            return folder;
        }
        else if (desc.type === 'color') {
            var controller = gui.addColor(pv, "value").name(pv.name);
            controller.onChange(function () { return onChange(pv); });
            return controller;
        }
        else {
            var controller = gui.add(pv, "value", desc.min, desc.max, desc.step).name(pv.name);
            controller.onChange(function () { return onChange(pv); });
            return controller;
        }
    }
    else {
        // It is a property list. We create a new folder, and add controls to the folder.
        var folder = gui.addFolder(name);
        //folder.open();
        bindControls(pv, folder, onChange);
        return folder;
    }
}
// Helper functions for defining properties 
function prop(type, def) { return new PropDesc(type, def); }
function boolProp(x) { return prop("boolean", x); }
function stringProp(x) { return prop("string", x); }
function floatProp(x) {
    if (x === void 0) { x = 0; }
    return prop("float", x);
}
function smallFloatProp(x) {
    if (x === void 0) { x = 0; }
    return prop("float", x).setStep(0.01);
}
function colorCompProp(x) {
    if (x === void 0) { x = 0; }
    return rangedIntProp(x, 0, 255);
}
function intProp(x) { return prop("int", x); }
function rangedIntProp(x, min, max) { return intProp(x).setRange(min, max); }
function rangedFloatProp(x, min, max) { return floatProp(x).setRange(min, max); }
function zeroToOneProp(x) { return floatProp(x).setRange(0, 1).setStep(0.01); }
function oneOrMoreIntProp(x) { return intProp(x).setRange(1); }
function timeProp(x) { return prop("time", x); }
function choiceProp(xs) { return prop("choices", xs[0]).setChoices(xs); }
function vec3Prop(x, y, z) {
    if (x === void 0) { x = 0; }
    if (y === void 0) { y = 0; }
    if (z === void 0) { z = 0; }
    return prop('vec3', { x: x, y: y, z: z });
}
function scaleProp() { return prop('vec3', { x: 1, y: 1, z: 1 }); }
function rotProp(yaw, pitch, roll) {
    if (yaw === void 0) { yaw = 0; }
    if (pitch === void 0) { pitch = 0; }
    if (roll === void 0) { roll = 0; }
    return prop('rot', { yaw: yaw, pitch: pitch, roll: roll });
}
function axisProp() { return choiceProp(['x', 'y', 'z']).setName("axis"); }
function conditionalProp(val, options) { return prop('conditional', val).setOptions(options); }
function colorProp(r, g, b) {
    if (r === void 0) { r = 0; }
    if (g === void 0) { g = 0; }
    if (b === void 0) { b = 0; }
    return prop('color', [r, g, b]);
}
// BEGIN: Deep merge copy and paste (With mods)
// The MIT License (MIT)
// Copyright (c) 2012 Nicholas Fisher
// https://github.com/KyleAMathews/deepmerge/blob/master/license.txt
var DeepMerge = /** @class */ (function () {
    function DeepMerge() {
    }
    DeepMerge.prototype.isMergeableObject = function (val) {
        return val && typeof val === 'object';
    };
    DeepMerge.prototype.emptyTarget = function (val) {
        return Array.isArray(val) ? [] : {};
    };
    DeepMerge.prototype.cloneIfNecessary = function (value, optionsArgument) {
        var clone = optionsArgument && optionsArgument.clone === true;
        return (clone && this.isMergeableObject(value)) ? this.deepMerge(this.emptyTarget(value), value, optionsArgument) : value;
    };
    DeepMerge.prototype.defaultArrayMerge = function (target, source, optionsArgument) {
        var destination = target.slice();
        for (var i = 0; i < destination.length; ++i) {
            var e = destination[i];
            if (typeof destination[i] === 'undefined')
                destination[i] = this.cloneIfNecessary(e, optionsArgument);
            else if (this.isMergeableObject(e))
                destination[i] = this.deepMerge(target[i], e, optionsArgument);
            else if (target.indexOf(e) === -1)
                destination.push(this.cloneIfNecessary(e, optionsArgument));
        }
        return destination;
    };
    DeepMerge.prototype.mergeObject = function (target, source, optionsArgument) {
        var destination = {};
        if (this.isMergeableObject(target))
            for (var key in target)
                destination[key] = this.cloneIfNecessary(target[key], optionsArgument);
        for (var key in source)
            if (!this.isMergeableObject(source[key]) || !target[key])
                destination[key] = this.cloneIfNecessary(source[key], optionsArgument);
            else
                destination[key] = this.deepMerge(target[key], source[key], optionsArgument);
        return destination;
    };
    DeepMerge.prototype.deepMerge = function (target, source, optionsArgument) {
        var array = Array.isArray(source);
        var options = optionsArgument || { arrayMerge: this.defaultArrayMerge };
        var arrayMerge = options.arrayMerge || this.defaultArrayMerge;
        if (array)
            return Array.isArray(target) ? arrayMerge(target, source, optionsArgument) : this.cloneIfNecessary(source, optionsArgument);
        else
            return this.mergeObject(target, source, optionsArgument);
    };
    return DeepMerge;
}());

// https://stackoverflow.com/questions/27078285/simple-throttle-in-js
// Returns a function, that, when invoked, will only be triggered at most once
// during a given window of time. Normally, the throttled function will run
// as much as it can, without ever going more than once per `wait` duration;
// but if you'd like to disable the execution on the leading edge, pass
// `{leading: false}`. To disable execution on the trailing edge, ditto.
function throttle(func, wait, options) {
    var context, args, result;
    var timeout = null;
    var previous = 0;
    if (!options) options = {};
    var later = function() {
      previous = options.leading === false ? 0 : Date.now();
      timeout = null;
      result = func.apply(context, args);
      if (!timeout) context = args = null;
    };
    return function() {
      var now = Date.now();
      if (!previous && options.leading === false) previous = now;
      var remaining = wait - (now - previous);
      context = this;
      args = arguments;
      if (remaining <= 0 || remaining > wait) {
        if (timeout) {
          clearTimeout(timeout);
          timeout = null;
        }
        previous = now;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
      } else if (!timeout && options.trailing !== false) {
        // deepcode ignore UseArrowFunction: <please specify a reason of ignoring this>
        timeout = setTimeout(later, remaining);
      }
      return result;
    };
  };

// END: Deepmerge

var vertexShader = `
    precision mediump float;
    precision mediump int;

    uniform mat4 modelViewMatrix; // optional
    uniform mat4 projectionMatrix; // optional
    uniform mat3 normalMatrix;

    //uniform mat4 viewProjectionMatrix;

    uniform vec3 lightDirection;
    uniform float lightIntensity;
    
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec4 color;

    varying vec4 vColor;

    void main()	{
        vColor = color;

        gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        // This could be baked back into the mesh
        vec3 transformedNormal = normalMatrix * normal;
        float dotNL = dot ( normal, lightDirection );
        float colorMult = clamp(lightIntensity * (1.0 + dotNL) / 2.0, 0.0, 1.0) / 255.0;
        vColor = color * colorMult;
    }
`;

var fragmentShader = `
    precision mediump float;
    precision mediump int;

    varying vec4 vColor;

    void main()	{
        if (vColor.w < 0.2)
            discard;
        gl_FragColor = vColor;
    }

    
`;

function fetchText(url){
  var Httpreq = new XMLHttpRequest(); // a new request
  Httpreq.open("GET",url,false);
  Httpreq.send(null);
  return Httpreq.responseText;          
}

// Main ARA code
var vim3d = {
}

vim3d.view = function (options) {
        // Pubnub initialization code
        var myUUID;
        var pubnub;

        // Variables 
        var avatars = {};
        var cursors = {};
        var rayCaster, intersections, cursor;
        var cameraState = { position: {x:0,y:0,z:0}, rotation: {x:0,y:0,z:0}};
        var stats, gui, controls;
        var camera, cameraTarget, scene, renderer, material, plane, sunlight, light1, light2, settings, mouse;
        var materialsLoaded = false;
        var objects = [];
        var throttledPublishMessage;

        // Used with STL example 
        //const material = new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
        // Default options object (merged with passed options)
        var defaultOptions = {
            showStats: false,
            showGui: false,
            pubnub: false,
            useSSAO: true,
            loader: {
                computeVertexNormals: true,
            },
            camera: {
                near: 0.1,
                far: 15000,
                fov: 50,
                zoom: 1,
                position: { x: 0, y: 5, z: -5 },
                target: { x: 0, y: -1, z: 0, },
                controls: {
                    trackball: false,
                    enableDamping: false,
                    dampingFactor: 0.05,
                    autoRotateSpeed: 0,
                    rotateSpeed: 1.0,
                    enablePan: true,
                    panSpeed: 1.0,
                    screenSpacePanning: true,
                    pixelPerKeyPress: 7.0,
                    zoomSpeed: 1.0,
                }
            },
            background: {
                // color: { r: 0x72, g: 0x64, b: 0x5b, }
                // color: { r: 215, g:217, b:215 }
                color: { r: 125, g:125, b:125 }
            },
            plane: {
                show: false,
                material: {
                    color: { r: 0x99, g: 0x99, b: 0x99, },
                    specular: { r: 0x10, g: 0x10, b: 0x10, }
                },
                position: {
                    x: 0, y: 0, z: 0
                }
            },
            cursor: {
                show: true,
                localColor: { r: 0x00, g: 0x00, b: 0x88 },
                remoteColor: { r: 0x00, g: 0x88, b: 0x00 },
                scale: 0.2,
            },
            sunlight: {
                skyColor: { r: 0x44, g: 0x33, b: 0x33 },
                groundColor: { r: 0x11, g: 0x11, b: 0x22 },
                intensity: 1,
            },
            light1: {
                // TODO: the positions of the lights are all wrong. 
                direction: { x: 0.3, y: -0.75, z: 0.3 },
                color: { r: 0xFF, g: 0xFF, b: 0xFF },
                intensity: 1.35,
            },
            light2: {
                position: { x: 0.5, y: 1, z: -1 },
                color: { r: 0xFF, g: 0xFF, b: 0xFF },
                //color: { r: 0xFF, g: 0xAA, b: 0x00 },
                intensity: 1,
            },
            avatar: {                
                width: 1,
                height: 1,
                depth: 0.2,
                color: { r: 0x00, g: 0x55, b: 0xFF },
            },
            object: {
                scale: 0.01,
                position: { x: 0, y: 0, z: 0 },
                rotation: { x: 0, y: 0, z: 0 },
                material: {
                    color: { r: 0x00, g: 0x55, b: 0xFF },
                    emissive: { r: 0x00, g: 0x00, b: 0x00 },
                    specular: { r: 0x11, g: 0x11, b: 0x11 },
                    flatShading: true,
                    shininess: 30,
                    wireframe: false,
                }
            }
        };
            
        // Get the raycaster extension functions from MeshBVHLib (https://github.com/gkjohnson/three-mesh-bvh) 
        THREE.BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
        THREE.BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;
        THREE.Mesh.prototype.raycast = acceleratedRaycast;       

        // Initialization of scene, loading of objects, and launch animation loop
        init();
        loadFromSettings(settings.url, settings.mtlurl);
        animate();
        function isColor(obj) {
            return typeof (obj) === 'object' && 'r' in obj && 'g' in obj && 'b' in obj;
        }
        function toColor(c) {
            if (!isColor(c))
                throw new Error("Not a color");
            return new THREE.Color(c.r / 255, c.g / 255, c.b / 255);
        }
        function toEuler(rot) {
            return new THREE.Euler(rot.x * Math.PI / 180, rot.y * Math.PI / 180, rot.z * Math.PI / 180);
        }
        function updateMaterial(targetMaterial, settings) {
            /*
            if ('color' in settings)
                targetMaterial.color = toColor(settings.color);
            if ('flatShading' in settings)
                targetMaterial.flatShading = settings.flatShading;
            if ('emissive' in settings)
                targetMaterial.emissive = toColor(settings.emissive);
            if ('specular' in settings)
                targetMaterial.specular = toColor(settings.specular);
            if ('wireframe' in settings)
                targetMaterial.wireframe = settings.wireframe;
            if ('shininess' in settings)
                targetMaterial.shininess = settings.shininess;
                */

          var viewProj = material.uniforms.viewProjectionMatrix.value;
          viewProj.copy(camera.projectionMatrix);
          viewProj.multiply(camera.matrixWorldInverse);

          var light1Direction = material.uniforms.lightDirection.value;
          var value = ('light1' in settings)
            ? new toVec(settings.light1.direction)
            : new THREE.Vector3(0.5, -0.5, 0.3)
          
          light1Direction.copy(value.normalize());

          material.uniforms.lightIntensity.value = ('light1' in settings)
            ? settings.light1.intensity
            : 1.0;
        }
        function initCamera() {
            updateCamera();
            camera.position.copy(toVec(settings.camera.position));
            cameraTarget = toVec(settings.camera.target);
            camera.lookAt(cameraTarget);
        }
        function updateCamera() {
            camera.fov = settings.camera.fov;
            camera.zoom = settings.camera.zoom;
            camera.near = settings.camera.near;
            camera.far = settings.camera.far;
        }
        function updateCameraControls() {
            if (!controls || controls.trackball != settings.camera.controls.trackball)
            {
                controls = settings.camera.controls.trackball 
                    ? new THREE.TrackballControls(camera, renderer.domElement) 
                    : new THREE.OrbitControls(camera, renderer.domElement);
                controls.trackball = settings.camera.controls.trackball;
            }
            controls.enableDamping = settings.camera.controls.enableDamping; // an animation loop is required when either damping or auto-rotation are enabled
            controls.dampingFactor = settings.camera.controls.dampingFactor;
            controls.autoRotate = settings.camera.controls.autoRotateSpeed > 0.0001 || settings.camera.controls.autoRotateSpeed< -0.0001;
            controls.autoRotateSpeed = settings.camera.autoRotateSpeed;  
            controls.rotateSpeed = settings.camera.controls.rotateSpeed; 
            controls.enablePan = settings.camera.controls.enablePan;
            controls.panSpeed = settings.camera.controls.panSpeed;
            controls.screenSpacePanning = settings.camera.controls.screenSpacePanning;
            controls.keySpanSpeed = settings.camera.controls.pixelPerKeyPress;
            controls.zoomSpeed = settings.camera.controls.zoomSpeed;
            controls.screenSpacePanning = settings.camera.controls.screenSpacePanning;
        }
        // Called every frame in case settings are updated 
        function updateScene() {
            scene.background = toColor(settings.background.color);
            // TODO: do we really need fog? I think it is useless. 
            //scene.fog = new THREE.Fog( settings.fog.color, settings.fog.near, settings.fog.far );
            plane.visible = settings.plane.show;
            updateMaterial(plane.material, settings.plane.material);
            plane.position.copy(toVec(settings.plane.position));
            // light1.position.copy(toVec(settings.light1.position));
            // light1.color = toColor(settings.light1.color);
            // light1.intensity = settings.light1.intensity;
            // light2.position.copy(toVec(settings.light2.position));
            // light2.color = toColor(settings.light2.color);
            // light2.intensity = settings.light2.intensity;
            // sunlight.skyColor = toColor(settings.sunlight.skyColor);
            //sunlight.groundColor = toColor(settings.sunlight.groundColor);
            //sunlight.intensity = settings.sunlight.intensity;
        }
        function updateObjects() {
            for (var child of objects) {
                //child.castShadow = true;
                //child.receiveShadow = true;
                var scale = scalarToVec(settings.object.scale);
                child.scale.copy(scale);
                if (!materialsLoaded) {
                    updateMaterial(material, settings);
                    child.material = material;
                }
                child.position.copy(settings.object.position);
                child.rotation.copy(toEuler(settings.object.rotation));
            }
            cursor.visible = settings.cursor.show;
            cursor.material.color = toColor(settings.cursor.localColor);
            cursor.scale.copy(scalarToVec(settings.cursor.scale));
            for (var k in cursors) {
                var c = cursors[k];
                c.material.color = toColor(settings.cursor.remoteColor);
                c.scale.copy(scalarToVec(settings.cursor.scale));
            }
        }
        function objectToPropDesc(obj, pdm) {
            // TODO: look for common patterns (colors, positions, angles) and process these specially.
            for (var k in obj) {
                var v = obj[k];
                switch (typeof (v)) {
                    case 'number':
                        pdm[k] = floatProp(v).setName(k);
                        break;
                    case 'string':
                        pdm[k] = stringProp(v).setName(k);
                        break;
                    case 'boolean':
                        pdm[k] = boolProp(v).setName(k);
                        break;
                    case 'object':
                        pdm[k] = objectToPropDesc(v, {});
                        break;
                }
            }
            return pdm;
        }
        function getOptionsDescriptor() {
            return objectToPropDesc(defaultOptions, {});
        }
        function getOrCreateDownloadLink() {
            var downloadLinkId = "ara_download_link_id";
            var downloadLink = document.getElementById(downloadLinkId);
            if (!downloadLink) {
                downloadLink = document.createElement("a");
                downloadLink.id = downloadLinkId;
                downloadLink.style.display = "none";
                document.body.appendChild(downloadLink);
            } 
            return downloadLink;
        }
        //https://stackoverflow.com/questions/17836273/export-javascript-data-to-csv-file-without-server-interaction
        function exportFile() {
            var downloadLink = getOrCreateDownloadLink();
            downloadLink.download = 'model.g3d';
            // TODO: fill out the G3D information in the blob.
            var data = new Blob();
            downloadLink.href = window.URL.createObjectURL(data);
            downloadLink.click();
        }        
        function loadAvatar(uuid) {
            if (uuid == myUUID)
               return;
            if (!(uuid in avatars))
            {
                console.log("Creating avatar");
                var mesh = createAvatar();
                avatars[uuid] = mesh;
            }
            if (!(uuid in cursors))
            {
                console.log("Creating avatar cursor");
                var mesh = createCursorMesh(false);
                cursors[uuid] = mesh;
            }
        }
        function unloadAvatar(uuid) {
            if (uuid in avatars) {
                scene.remove(avatars[uuid]);
                delete avatars[uuid];
            }
            if (uuid in cursors) {
                scene.remove(cursors[uuid]);
                delete cursors[uuid];
            }
        }
        function onMessage(message) {
            if (message.uuid == myUUID)
               return;
            loadAvatar(message.uuid);
            var avatar = avatars[message.uuid];            
            if (avatar && message.camera) {
                avatar.position.set(message.camera.position.x, message.camera.position.y, message.camera.position.z);
                avatar.rotation.set(message.camera.rotation.x, message.camera.rotation.y, message.camera.rotation.z);
            }
            var remoteCursor = cursors[message.uuid];
            if (remoteCursor && message.cursor)
                remoteCursor.position.set(message.cursor.position.x, message.cursor.position.y, message.cursor.position.z);
        }
        function publishMessage() {
            if (!pubnub)
                return;
            /*
            //var newCamera = event.target.object;            
            if (camera.position.x == cameraState.position.x
            && camera.position.y == cameraState.position.y
            && camera.position.z == cameraState.position.z
            && camera.rotation.x == cameraState.rotation.x
            && camera.rotation.y == cameraState.rotation.y
            && camera.rotation.z == cameraState.rotation.z)
                return;

            cameraState.position.x = newCamera.position.x;
            cameraState.position.y = newCamera.position.y;
            cameraState.position.z = newCamera.position.z;
            cameraState.rotation.x = newCamera.rotation.x;
            cameraState.rotation.y = newCamera.rotation.y;
            cameraState.rotation.z = newCamera.rotation.z;
            */
            var cursor = null;
            if (intersections.length > 0) 
            {
                cursor = {
                    position: {
                        x: intersections[0].point.x,
                        y: intersections[0].point.y,
                        z: intersections[0].point.z,
                    },
                    faceIndex: intersections[0].faceIndex,
                    distance: intersections[0].distance
                };
            }
            // https://stackoverflow.com/questions/54433325/unhandled-promise-exception
            pubnub.publish({
                channel: 'my_channel',                    
                message: {
                    uuid : myUUID,
                    cursor : cursor, 
                    camera : {
                        position: {
                            x: camera.position.x,
                            y: camera.position.y,
                            z: camera.position.z,
                        },
                        rotation: {
                            x: camera.rotation.x,
                            y: camera.rotation.y,
                            z: camera.rotation.z,
                        }
                    }
                }
            }).catch(error => console.log(error));
        }        

        function createCursorMesh( localOrRemote)
        {
            var color = localOrRemote ? settings.cursor.localColor : settings.cursor.remoteColor;
            var c = new THREE.Mesh(new THREE.IcosahedronBufferGeometry(0.5), new THREE.MeshPhongMaterial({color: color}));
            c.scale.set(scalarToVec(settings.cursor.scale));
            c.visible = settings.cursor.show;
            scene.add(c);
            return c;
        }

        function createAvatar()
        {
            var geometry = new THREE.BoxBufferGeometry(settings.avatar.width, settings.avatar.height, settings.avatar.depth);
            var material = new THREE.MeshPhongMaterial({ color: toColor(settings.avatar.color) } );
            var mesh = new THREE.Mesh(geometry, material)
            scene.add(mesh);
            return mesh;
        }

        // Scene initialization
        function init() 
        {
            // publishes PubNub message every X msec
            throttledPublishMessage = throttle(publishMessage, 200);
        
            // Initialize the settings 
            settings = (new DeepMerge()).deepMerge(defaultOptions, options, undefined);
            // If a canvas is given, we will draw in it.
            var canvas = document.getElementById(settings.canvasId);
            if (!canvas) {
                // Add to a div in the web page.
                canvas = document.createElement('canvas');
                document.body.appendChild(canvas);            
            }
            renderer = new THREE.WebGLRenderer({ canvas: canvas });
            // Create the camera and size everything appropriately  
            camera = new THREE.PerspectiveCamera();
            // Initialize the normalized moust position for ray-casting.
            mouse = new THREE.Vector2();
         
            resizeCanvas(true);
            // Create scene object
            scene = new THREE.Scene();

            // Used for hit-testing (see https://github.com/mrdoob/three.js/blob/master/examples/webgl_interactive_cubes.html)
            rayCaster = new THREE.Raycaster();
            rayCaster.firstHitOnly = true;
            // Create a property descriptor 
            var propDesc = getOptionsDescriptor();
            // Create a property list from the descriptor 
            var props = new PropList(propDesc);
            // Iniitlaize the property list values             
            props.fromJson(options);
            if (settings.showGui) {
                // Create a new DAT.gui controller 
                gui = new dat.GUI();
                // Bind the properties to the DAT.gui controller, returning the scene when it updates
                bindControls(props, gui, function () {
                    settings = props.toJson;
                    updateScene();
                });
                // TODO: enable this.
                /*
                    var obj = { export: exportFile };
                    gui.add(obj, 'export').name("Export to G3D ... ");
                */
            }
            // Ground            
            plane = new THREE.Mesh(new THREE.PlaneBufferGeometry(1000, 1000), new THREE.MeshPhongMaterial());
            plane.rotation.x = -Math.PI / 2;
            plane.receiveShadow = true;
            scene.add(plane);
            // Cursor
            cursor = createCursorMesh(true);
            // Lights
            sunlight = new THREE.HemisphereLight();
            scene.add(sunlight);
            //light1 = addShadowedLight(scene);
            //light2 = addShadowedLight(scene);
            // Material 
            
            //material = new THREE.MeshPhongMaterial({vertexColors: THREE.VertexColors});

            material = new THREE.RawShaderMaterial( {
                uniforms: {
                  lightDirection: { value: new THREE.Vector3() },
                  lightIntensity: { value: 1.0 },
                  viewProjectionMatrix: { value: new THREE.Matrix4() }
                },
                vertexShader: vertexShader,
                fragmentShader: fragmentShader,
            } );

            // postprocessing

            composer = new THREE.EffectComposer(renderer);

            var parent = canvas.parentElement;
            var rect = parent.getBoundingClientRect();
            var width = rect.width;
            var height = rect.height;
    
            var ssaoPass = new THREE.SSAOPass( scene, camera, width, height );
            ssaoPass.kernelRadius = 16;
            composer.addPass( ssaoPass );
            
            // THREE JS renderer
            renderer.setPixelRatio(window.devicePixelRatio);

            // Initial scene update: happens if controls change 
            updateScene();

            // Creates and updates camera controls 
            updateCameraControls();

            // Stats display 
            if (settings.showStats) {
                stats = new Stats();
                document.body.appendChild(stats.dom);
            }
            
            // Add a mouse move listener
            document.addEventListener( 'mousemove', onDocumentMouseMove, false );

            // Add a resize event listener
            // TODO: do this when in full window mode. Right now the attempt was to get this all to work in a <canvas> element
            //window.addEventListener( 'resize', onWindowResize, false );
            
            // Initial set-up of the camera
            initCamera();

            // Set-up pubnub
            if (settings.pubnub) 
            {
                myUUID = PubNub.generateUUID();
                pubnub = new PubNub({
                    publishKey: "pub-c-39d36562-7867-4ddc-b7e2-9eaaa344f727",
                    subscribeKey: "sub-c-e742a396-5e51-11ea-b226-5aef0d0da10f",
                    uuid: myUUID
                });
                pubnub.addListener({
                    message: function(m) {
                        onMessage(m.message);
                    },
                    presence: function(m) {
                        if (m.action == "join") {
                            loadAvatar(m.uuid);
                        }
                        else if (m.action == "leave") {
                            unloadAvatar(m.uuid);
                        }
                        //console.log("presence message: " + JSON.stringify(m));
                    }
                });
                pubnub.subscribe({
                    channels: ['my_channel'],
                    withPresence: true
                });
            }

            vim3d.scene = scene;
            vim3d.settings = settings;
            vim3d.renderer = renderer;
            vim3d.objects = objects;
        }

        function loadFromSettings(url, mtlurl)
        {
          if (Array.isArray(url))
          {
            console.time("Loading Array: " + url);
            toLoad = url.length;
            url.forEach((url) => {
              loadIntoScene(url, mtlurl, () => {
                toLoad = toLoad - 1;
                if (toLoad === 0) {
                  console.timeEnd("Loading Array: " + url)
                  console.log("\n --- Completed Load --- \n")
                }
              })
            })
          }
          else {
            console.time("Loading: " + url);
            loadIntoScene(url, mtlurl, () => {
              console.timeEnd("Loading: " + url)
              console.log("\n --- Completed Load --- \n")
            });  
          }
        }

        // Use this when in full frame mode.
        function onWindowResize() {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize( window.innerWidth, window.innerHeight );
        }

        function onDocumentMouseMove( event ) {
            event.preventDefault();
            mouse.x = ( event.clientX / window.innerWidth ) * 2 - 1;
            mouse.y = - ( event.clientY / window.innerHeight ) * 2 + 1;
        }

        function resizeCanvas(force) {
            if (force === void 0) { force = false; }
            if (!settings.autoResize && !force)
                return;
            var canvas = renderer.domElement;
            var parent = canvas.parentElement;
            //canvas.width  = parent.clientWidth;
            //canvas.height = parent.clientHeight;
            // https://stackoverflow.com/questions/41814539/html-div-height-keeps-growing-on-window-resize-event
            // you must pass false here or three.js sadly fights the browser
            //<canvas id="canvas3d" style="position: absolute"></canvas>
            var rect = parent.getBoundingClientRect();
            var w = rect.width / window.devicePixelRatio;
            var h = rect.height / window.devicePixelRatio;
            renderer.setSize(w, h, false);
            // Set aspect ratio
            camera.aspect = canvas.width / canvas.height;
            camera.updateProjectionMatrix();
        }
        function outputStats(obj) {
            console.log("Object id = " + obj.uuid + " name = " + obj.name);
            if (obj.isBufferGeometry) {
                console.log("Is a BufferGeometry");
                var position = obj.getAttribute('position');
                if (!position)
                    throw new Error("Could not find a position attribute");
                var nVerts = position.count;
                var nFaces = obj.index ? obj.index.count / 3 : nVerts / 3;
                console.log("# vertices = " + nVerts);
                console.log("# faces = " + nFaces);
                for (var attrName in obj.attributes) {
                    var attr = obj.getAttribute(attrName);
                    console.log("has attribute " + attrName + " with a count of " + attr.count);
                }
            }
            else if (obj.isGeometry) {
                console.log("Is a Geometry");
                console.log("# vertices = " + obj.vertices.length);
                console.log("# faces = " + obj.faces.length);
            }
            else {
                console.log("Is neither a Geometry nor a BufferGeometry");
            }
        }
        function loadObject(callback) {
          return (obj) => {
            objects.push(obj);
            scene.add(obj);
            // Output some stats
            var g = obj.geometry;
            if (!g) g = obj;
            outputStats(g);
            g.computeBoundsTree();

            updateObjects();
            if (callback)
              callback();
          }
        }
        function loadIntoScene(fileName, mtlurl, callback) {
            console.log("Loading object from " + fileName);
            var extPos = fileName.lastIndexOf(".");
            var ext = fileName.slice(extPos + 1).toLowerCase();
            switch (ext) {
                case "3ds": {
                    var loader = new THREE.TDSLoader();
                    loader.load(fileName, loadObject(callback));
                    return;
                }
                case "fbx": {
                    var loader = new THREE.FBXLoader();
                    loader.load(fileName, loadObject(callback));
                    return;
                }
                case "dae": {
                    var loader = new THREE.ColladaLoader();
                    loader.load(fileName, loadObject(callback));
                    return;
                }
                case "gltf": {
                    var loader = new THREE.GLTFLoader();
                    loader.load(fileName, loadObject(callback));
                    return;
                }
                case "gcode": {
                    var loader = new THREE.GCodeLoader();
                    loader.load(fileName, loadObject(callback));
                    return;
                }
                case "obj": {
                    var objLoader_1 = new THREE.OBJLoader();
                    var mtlLoader = new THREE.MTLLoader();
                    if (mtlurl) {
                        mtlLoader.load(mtlurl, function (mats) {
                            mats.preload();
                            materialsLoaded = true;
                            objLoader_1.setMaterials(mats).load(fileName, loadObject(callback));
                        }, null, function () {
                            console.warn("Failed to load material " + mtlurl + " trying to load obj alone");
                            objLoader_1.load(fileName, loadObject(callback));
                        });
                    }
                    else {
                        objLoader_1.load(fileName, loadObject(callback));
                    }
                    return;
                }
                case "pcd": {
                    var loader = new THREE.PCDLoader();
                    loader.load(fileName, loadObject(callback));
                    return;
                }
                case "ply": {
                    var loader = new THREE.PLYLoader();
                    loader.load(fileName, function (geometry) {
                        if (settings.loader.computeVertexNormals)
                          geometry.computeVertexNormals();
                        loadObject(callback)(new THREE.Mesh(geometry));
                    });
                    return;
                }
                case "stl": {
                    var loader = new THREE.STLLoader();
                    loader.load(fileName, function (geometry) {
                        if (settings.loader.computeVertexNormals)
                          geometry.computeVertexNormals();
                        loadObject(callback)(new THREE.Mesh(geometry));
                    });
                    return;
                }
                case "json": {
                  var str = fetchText(fileName);
                  var jsonData = JSON.parse(str);
                  // We have been given a list of items to load, lets load 'em
                  var entities = Object.keys(jsonData);
                  var entitiesToLoad = entities.length;
                  entities.forEach((entity, index) => {
                    var url = jsonData[entity]
                    console.time("Loading: " + entity);
           
                    loadIntoScene(url, mtlurl, () => {
                      // Thank goodness there is no threading in JS :-)
                      console.timeEnd("Loading: " + entity);

                      entitiesToLoad = entitiesToLoad - 1;
                      console.log(`Completed ${entitiesToLoad - entities.length}, ${entitiesToLoad} remaining`);
                      if (callback && !entitiesToLoad)
                        callback();
                    });
                  })
                  return;
                }
                // HACK: Assume g3d as default case.
                case "g3d":
                default:
                {
                    var loader = new THREE.G3DLoader();
                    loader.load(fileName, function (geometry) {
                        if (settings.loader.computeVertexNormals)
                            geometry.computeVertexNormals();
                        var mesh = new THREE.Mesh(geometry);
                        var name = fileName.substring(fileName.lastIndexOf('/')+1);
                        name = name.slice(0, -4);
                        mesh.name = name;
                        loadObject(callback)(mesh);
                    }, null, console.error);
                    return;
                }
                
                // throw new Error("Unrecognized file type extension '" + ext + "' for file " + fileName);
            }
        }
        // Helper functions 
        function toVec(obj) {
            return new THREE.Vector3(obj.x, obj.y, obj.z);
        }
        function scalarToVec(x) {
            return new THREE.Vector3(x, x, x);
        }
        function addShadowedLight(scene) {
            var dirLight = new THREE.DirectionalLight();
            scene.add(dirLight);
            /*  
            dirLight.castShadow = true;
            var d = 10;
            dirLight.shadow.camera.left = -d;
            dirLight.shadow.camera.right = d;
            dirLight.shadow.camera.top = d;
            dirLight.shadow.camera.bottom = -d;
            dirLight.shadow.camera.near = 0.01;
            dirLight.shadow.camera.far = 1000;
            //dirLight.shadow.mapSize.width = 1024;
            //dirLight.shadow.mapSize.height = 1024;
            dirLight.shadow.mapSize.width = 4096;
            dirLight.shadow.mapSize.height = 4096;
            dirLight.shadow.bias = -0.001;
            */
            return dirLight;
        }
        // https://developer.mozilla.org/en-US/docs/Web/API/HTML_Drag_and_Drop_API/File_drag_and_drop
        function dragOverHandler(ev) {
            console.log('File(s) in drop zone');
            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();
        }
        function droppedFile(file) {
            // TODO: deal with other data ... 
            var fileName = file.name;
            loadIntoScene("../data/" + fileName, null);
        }
        function dropHandler(ev) {
            console.log('File(s) dropped');
            // Prevent default behavior (Prevent file from being opened)
            ev.preventDefault();
            if (ev.dataTransfer.items) {
                // Use DataTransferItemList interface to access the file(s)
                for (var i = 0; i < ev.dataTransfer.items.length; i++) {
                    // If dropped items aren't files, reject them
                    if (ev.dataTransfer.items[i].kind === 'file') {
                        var file = ev.dataTransfer.items[i].getAsFile();
                        droppedFile(file);
                    }
                }
            }
            else {
                // Use DataTransfer interface to access the file(s)
                for (var i = 0; i < ev.dataTransfer.files.length; i++) {
                    droppedFile(ev.dataTransfer.files[i]);
                }
            }
            // Pass event to removeDragData for cleanup
            removeDragData(ev);
        }
        function removeDragData(ev) {
            if (ev.dataTransfer.items) {
                // Use DataTransferItemList interface to remove the drag data
                ev.dataTransfer.items.clear();
            }
            else {
                // Use DataTransfer interface to remove the drag data
                ev.dataTransfer.clearData();
            }
        }
        // Calls render, and asks the framework to prepare the next frame 
        function animate() {
            requestAnimationFrame(animate);
            render();
            if (stats)
                stats.update();
        }   
        function rayCastTest() {
            // If not showing cursor skip ray cast altogether. But make sure cursor is really not visible.
            if (!settings.cursor.show) {
                cursor.visible = false;
                return; 
            }
            rayCaster.setFromCamera(mouse, camera);
            // Only count intersections against visible objects
            intersections = rayCaster.intersectObjects(objects).filter(i => i.object.visible == true);
            if (intersections.length > 0)
            {
                cursor.visible = settings.cursor.show;
                const point = intersections[0].point;
                cursor.position.set(point.x, point.y, point.z); 
            }
            else
            {
                cursor.visible = false;
            }
        }    
    
        // Updates scene objects, and draws the scene 
        // TODO: update the camera 
        function render() {
            resizeCanvas();
            updateObjects();
            updateCamera();
            updateCameraControls();
            controls.update();
            rayCastTest();
            throttledPublishMessage();

            if (settings.useSSAO)
            {
              composer.render();
            }
            else {
              renderer.render(scene, camera);
            }
        }
    };

vim3d.isolate = function(name) {
    for (var obj of vim3d.objects)         
        if (obj.name == name)
            obj.visible = true;
        else 
            obj.visible = false;
}

vim3d.setVis = function(name, vis) {
    for (var obj of vim3d.objects)         
        if (obj.name == name)
            obj.visible = vis;
}

vim3d.setVisAll = function(vis) {
    for (var obj of vim3d.objects) 
        obj.visible = vis;
}

//# sourceMappingURL=index.js.map