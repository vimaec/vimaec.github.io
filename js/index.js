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
        return this.items.find((v) => v.name === name);
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
    var later = function () {
        previous = options.leading === false ? 0 : Date.now();
        timeout = null;
        result = func.apply(context, args);
        if (!timeout) context = args = null;
    };
    return function () {
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
        // vec3 transformedNormal = normalMatrix * normal;
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

function fetchText(url) {
    var Httpreq = new XMLHttpRequest(); // a new request
    Httpreq.open("GET", url, false);
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
    var throttledPublishCameraXfo;

    // Variables
    var materials = {};
    var avatars = {};
    var cursors = {};
    var rayCaster, intersections, cursor;
    var cameraState = { position: { x: 0, y: 0, z: 0 }, rotation: { x: 0, y: 0, z: 0 } };
    var stats, gui, controls;
    var camera, cameraTarget, scene, renderer, material, plane, sunlight, light1, light2, settings, mouse;
    var ssaoPass, composer;

    var materialsLoaded = false;
    var objects = [];

    // Used with STL example
    //const material = new THREE.MeshPhongMaterial( { color: 0xff5533, specular: 0x111111, shininess: 200 } );
    // Default options object (merged with passed options)
    var defaultOptions = {
        showStats: false,
        showGui: false,
        pubnub: false,
        antiAlias: false,
        SSAO: {
            enable: true,
            kernelRadius: 16,
            minDistance: 0.005,
            maxDistance: 0.1
        },
        loader: {
            computeVertexNormals: true,
        },
        camera: {
            near: 0.001,
            far: 1,
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
            color: { r: 125, g: 125, b: 125 }
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
            scale: 0.2,
        },
        light1: {
            // TODO: the positions of the lights are all wrong.
            direction: { x: 0.3, y: -0.75, z: 0.3 },
            color: { r: 0xFF, g: 0xFF, b: 0xFF },
            intensity: 1.35,
        },
        avatar: {
            width: 1,
            height: 1,
            depth: 0.2,
            color: { r: 0x00, g: 0x55, b: 0xFF },
            minOpacity: 0.1,
            maxOpacity: 0.6,
            fadeDistance: 5,
        },
        object: {
            scale: 0.01,
            position: { x: 0, y: 0, z: 0 },
            rotation: { x: 0, y: 0, z: 0 },
            categories: {

            },
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
        if (!controls || controls.trackball != settings.camera.controls.trackball) {
            controls = settings.camera.controls.trackball
                ? new THREE.TrackballControls(camera, renderer.domElement)
                : new THREE.OrbitControls(camera, renderer.domElement);
            controls.trackball = settings.camera.controls.trackball;
        }
        controls.enableDamping = settings.camera.controls.enableDamping; // an animation loop is required when either damping or auto-rotation are enabled
        controls.dampingFactor = settings.camera.controls.dampingFactor;
        controls.autoRotate = settings.camera.controls.autoRotateSpeed > 0.0001 || settings.camera.controls.autoRotateSpeed < -0.0001;
        controls.autoRotateSpeed = settings.camera.autoRotateSpeed;
        controls.rotateSpeed = settings.camera.controls.rotateSpeed;
        controls.enablePan = settings.camera.controls.enablePan;
        controls.panSpeed = settings.camera.controls.panSpeed;
        controls.screenSpacePanning = settings.camera.controls.screenSpacePanning;
        controls.keySpanSpeed = settings.camera.controls.pixelPerKeyPress;
        controls.zoomSpeed = settings.camera.controls.zoomSpeed;
        controls.screenSpacePanning = settings.camera.controls.screenSpacePanning;
    }

    function updateSSAO() {
        if (settings.SSAO.enable) {
            ssaoPass.kernelRadius = settings.SSAO.kernelRadius;
            ssaoPass.minDistance = settings.SSAO.minDistance;
            ssaoPass.maxDistance = settings.SSAO.maxDistance;
        }
    }

    // Called every frame in case settings are updated
    function updateScene() {
        scene.background = toColor(settings.background.color);
        // TODO: do we really need fog? I think it is useless.
        //scene.fog = new THREE.Fog( settings.fog.color, settings.fog.near, settings.fog.far );
        plane.visible = settings.plane.show;
        updateMaterial(plane.material, settings.plane.material);
        plane.position.copy(toVec(settings.plane.position));
    }
    function updateObjects() {
        for (var child of objects) {
            //child.castShadow = true;
            //child.receiveShadow = true;
            child.scale.setScalar(settings.object.scale);
            if (!materialsLoaded) {
                updateMaterial(material, settings);
                child.material = material;
            }
            child.position.copy(settings.object.position);
            child.quaternion.setFromEuler(toEuler(settings.object.rotation));
        }
        cursor.visible = settings.cursor.show;
        cursor.scale.setScalar(settings.cursor.scale);
        for (var k in cursors) {
            var c = cursors[k];
            c.scale.setScalar(settings.cursor.scale);
        }
    }

    function updateAvatarTransparency() {
        const { fadeDistance, minOpacity, maxOpacity } = settings.avatar;
        const fadeBeginSq = fadeDistance * fadeDistance;
        for (const uuid in avatars) {
            var avatar = avatars[uuid];
            // How far from us?
            var avatarDistanceSq = avatar.position.distanceToSquared(camera.position);
            if (avatarDistanceSq < fadeBeginSq)
            {
                var fade = minOpacity + (maxOpacity - minOpacity) * avatarDistanceSq / fadeBeginSq;
                materials[uuid].opacity = fade;
            }
            else{
                materials[uuid].opacity = maxOpacity;
            }
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
        
        if (!(uuid in avatars)) {
            console.log("Creating avatar");
            var mesh = createAvatar(uuid);
            avatars[uuid] = mesh;
        }
        if (!(uuid in cursors)) {
            console.log("Creating avatar cursor");
            var mesh = createCursorMesh(uuid);
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

    function onMessage(uuid, message) {
        // We never care about our own messages
        if (uuid == myUUID)
            return;

        const { camera, cursor } = message;
        if (camera != null)
            onUpdateAvatar(uuid, camera, cursor)

        const { rallyCall } = message;
        if (rallyCall != null)
            onRallyCall(rallyCall)
    }

    function onUpdateAvatar(uuid, avatarXfo, cursorXfo) {
        loadAvatar(uuid);
        var avatar = avatars[uuid];
        if (avatar) {
            if (avatarXfo.position)
                setVector(avatar.position, avatarXfo.position);
            if (avatarXfo.rotation)
                setQuaternion(avatar.quaternion, avatarXfo.rotation);
        }
        var remoteCursor = cursors[uuid];
        if (remoteCursor && cursorXfo)
            setVector(remoteCursor.position, cursorXfo.position);
    }

    var isRallying = false;
    var rotationMatrix = new THREE.Matrix4();
    var upVector = new THREE.Vector3(0, 1, 0);
    var eyePoint = new THREE.Vector3();
    var cameraForward = new THREE.Vector3();
    var targetQuat = new THREE.Quaternion();

    function onRallyCall(rallyCall) {

        // We set the camera xfo
        const { rallyPoint, viewDirection, viewDistance } = rallyCall;

        // Disable user input, and set it the orbit target to be the highlighted object
        isRallying = true;
        setVector(eyePoint, rallyPoint);
        setVector(cameraForward, viewDirection)
        controls.target.copy(eyePoint);
        controls.target.addScaledVector(cameraForward, viewDistance || 10);

        // Our offset moves us backwards from the rallyPoint but still facing towards it
        // var zOffset = camera.getWorldDirection(cameraForward)
        //     .multiplyScalar(-viewDistance);
        // If our offset is not in the same direction as the viewDirection, then 
        // we negate the offset X/Z values to flip us around
        // This is a very cheap way to put everyone in the same hemipshere
        // (note: this is GT because our offset is the inverse of the direction we actually face)
        // if (zOffset.dot(viewDirection) > 0) {
        //     zOffset.x *= -1;
        //     zOffset.z *= -1;
        // }
        //targetPosition.add(zOffset);
        vectorTween(camera.position, eyePoint);

        // Now rotate to look at rally point.  This theoretically should be a no-op
        rotationMatrix.lookAt(eyePoint, controls.target, upVector);
        targetQuat.setFromRotationMatrix(rotationMatrix);
        quaternionTween(camera.quaternion, targetQuat);
    }

    var originalRotation;
    var tweenTime = 3000; // 3 seconds?
    function quaternionTween(start, end) {
        var cameraTween = {  t: 0 };
        originalRotation = start.clone();
        createjs.Tween.get(cameraTween)
            .to({ t: 1 }, tweenTime, createjs.Ease.quadInOut)
            .on("change", (tween) => {
                var frameRotation = originalRotation.clone();
                frameRotation.slerp(end, cameraTween.t);
                start.copy(frameRotation);
                console.log(frameRotation);
            })
            // Don't forget to turn off the manual override once this is done
            .call(() => isRallying = false)
    }

    function vectorTween(start, end, time) {
        //var cameraTween = {  t: 0 };
        //originalRotation = start.clone();
        createjs.Tween.get(start)
            .to(stripVector(end), tweenTime, createjs.Ease.quadInOut)
            .on("change", (tween) => {
                //console.log(start);
            });
    }

    function publishCameraXfo() {

        var cursor = null;
        if (intersections.length > 0) {
            cursor = {
                position: stripVector(intersections[0].point),
                faceIndex: intersections[0].faceIndex,
                distance: intersections[0].distance
            };
        }
        var message = {
            cursor: cursor,
            camera: {
                position: stripVector(camera.position),
                rotation: stripQuaternion(camera.quaternion)
            }
        }
        publish(message);
    }

    function publishRallyCall() {
        // If we are pointing at something rally to there
        var rallyPoint;
        var viewDirection;
        var viewDistance = 10;
        if (intersections.length > 0) {
            const { point } = intersections[0]

        //     // The hitpoint is what we are looking at
        //     rallyPoint = point.clone();

        //     // Indicate the direction/distance we are looking towards the rally point
            const cameraToPoint = point.clone().sub(camera.position);
            viewDistance = cameraToPoint.length();
        //     viewDirection = cameraToPoint.multiplyScalar(1.0 / viewDistance);
        //     viewDistance = viewDistance * 0.8;
        }
        //else {
            rallyPoint = camera.position;
            viewDirection = camera.getWorldDirection(cameraForward);
            // We want the users to appear in front of us, looking at us
            //viewDirection.multiplyScalar(-1);
        //}
        publish({
            rallyCall: {
                rallyPoint,
                viewDirection,
                viewDistance
            }
        })
        // else
    }

    function publish(message) {
        if (!pubnub)
            return;

        // https://stackoverflow.com/questions/54433325/unhandled-promise-exception
        pubnub.publish({
            channel: 'my_channel',
            message: message
        }).catch(error => console.log(error));
    }



    function getMaterial(uuid) {
        var mtl = materials[uuid]
        if (!mtl) {
            materials[uuid] = mtl = new THREE.MeshPhongMaterial({ color: uuidToColor(uuid), opacity: 0.6, transparent: true })
        }
        return mtl
    }
    function createCursorMesh(uuid) {
        var material = getMaterial(uuid);
        var c = new THREE.Mesh(new THREE.IcosahedronBufferGeometry(0.5), material);
        c.scale.setScalar(settings.cursor.scalar);
        c.visible = settings.cursor.show;
        scene.add(c);
        return c;
    }

    function createAvatar(uuid) {
        var material = getMaterial(uuid);
        var geometry = new THREE.BoxBufferGeometry(settings.avatar.width, settings.avatar.height, settings.avatar.depth);
        var mesh = new THREE.Mesh(geometry, material)
        scene.add(mesh);
        return mesh;
    }

    // Scene initialization
    function init() {
        // publishes PubNub message every X msec
        throttledPublishCameraXfo = throttle(publishCameraXfo, 100);

        // Initialize the settings
        settings = (new DeepMerge()).deepMerge(defaultOptions, options, undefined);
        myUUID = getMyUuid();
            
        // If a canvas is given, we will draw in it.
        var canvas = document.getElementById(settings.canvasId);
        if (!canvas) {
            // Add to a div in the web page.
            canvas = document.createElement('canvas');
            document.body.appendChild(canvas);
        }
        renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: settings.antiAlias });
        // Create the camera and size everything appropriately
        camera = new THREE.PerspectiveCamera();
        // Initialize the normalized moust position for ray-casting.
        mouse = new THREE.Vector2();

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
            gui = new dat.GUI({ autoPlace: false, closeOnTop: true, scrollable: true });
            document.getElementById("datguicontainer").appendChild(gui.domElement);
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
        cursor = createCursorMesh(myUUID);
        // Lights
        sunlight = new THREE.HemisphereLight();
        scene.add(sunlight);
        //light1 = addShadowedLight(scene);
        //light2 = addShadowedLight(scene);
        // Material

        //material = new THREE.MeshPhongMaterial({vertexColors: THREE.VertexColors});

        material = new THREE.RawShaderMaterial({
            uniforms: {
                lightDirection: { value: new THREE.Vector3() },
                lightIntensity: { value: 1.0 },
                viewProjectionMatrix: { value: new THREE.Matrix4() }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.DoubleSide
        });

        // postprocessing

        composer = new THREE.EffectComposer(renderer);

        ssaoPass = new THREE.SSAOPass(scene, camera);
        ssaoPass.kernelRadius = 16;
        composer.addPass(ssaoPass);

        // THREE JS renderer
        renderer.setPixelRatio(window.devicePixelRatio);

        // Initial scene update: happens if controls change
        resizeCanvas(true);
        updateScene();

        // Creates and updates camera controls
        updateCameraControls();

        // Stats display
        if (settings.showStats) {
            stats = new Stats();
            document.body.appendChild(stats.dom);
        }

        // Add a mouse move listener
        document.addEventListener('mousemove', onDocumentMouseMove, false);

        // Add a resize event listener
        window.addEventListener('resize', onWindowResize, false);

        // Initial set-up of the camera
        initCamera();

        // Set-up pubnub
        if (settings.pubnub) {
            pubnub = new PubNub({
                publishKey: "pub-c-21488fa4-ced8-47af-af29-e12e448d13fe",
                subscribeKey: "sub-c-97dcb2d0-6d22-11ea-94ed-e20534093ea4",
                uuid: myUUID
            });
            pubnub.addListener({
                message: function (m) {
                    onMessage(m.publisher, m.message);
                },
                presence: function (m) {
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
        vim3d.getEventMouseCoordinates = getEventMouseCoordinates;
        vim3d.getRayCastIntersections = getRayCastIntersections;

        vim3d.publishRallyCall = publishRallyCall;
    }

    function loadFromSettings(url, mtlurl) {
        if (Array.isArray(url)) {
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
        var rect = renderer.domElement.getBoundingClientRect();
        camera.aspect = rect.width / rect.height;
        camera.updateProjectionMatrix();
    }

    function getEventMouseCoordinates(event) {

        let clientX = event.clientX;
        let clientY = event.clientY;
        if (event.changedTouches && event.changedTouches.length > 0) {
            clientX = event.changedTouches[0].clientX;
            clientY = event.changedTouches[0].clientY;
        }

        var rect = renderer.domElement.getBoundingClientRect();
        return new THREE.Vector2(
            ((clientX - rect.left) / rect.width) * 2 - 1,
            - ((clientY - rect.top) / rect.height) * 2 + 1
        );
    }

    function onDocumentMouseMove(event) {
        event.preventDefault();
        const mouseCoords = getEventMouseCoordinates(event);
        mouse.x = mouseCoords.x;
        mouse.y = mouseCoords.y;
    }

    function getRayCastIntersections(coords) {
        rayCaster.setFromCamera(coords, camera);
        // Only count intersections against visible objects
        // see: https://threejs.org/docs/#api/en/core/Raycaster.intersectObject
        return rayCaster.intersectObjects(objects).filter(i => i.object.visible == true);
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
        ssaoPass.setSize(rect.width, rect.height);
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
            // outputStats(g);
            g.computeBoundsTree();

            updateObjects();
            if (callback)
                callback();
        }
    }
    function loadIntoScene(fileName, mtlurl, callback) {
        // console.log("Loading object from " + fileName);
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
                        // console.warn("Failed to load material " + mtlurl + " trying to load obj alone");
                        objLoader_1.load(fileName, loadObject(callback));
                    });
                }
                else {
                    objLoader_1.load(fileName, loadObject(callback));
                };
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
                        var name = fileName.substring(fileName.lastIndexOf('/') + 1);
                        name = name.slice(0, -4);
                        mesh.name = decodeURIComponent(name);
                        // Add to the display
                        gui.add(mesh, 'visible').name(mesh.name || ('Mesh' + objects.length));
                        settings.object.categories[name] = true;
                        loadObject(callback)(mesh);
                    }, null, console.error);
                    return;
                }

            // throw new Error("Unrecognized file type extension '" + ext + "' for file " + fileName);
        }
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

    function updateCursor() {
        // If not showing cursor skip ray cast altogether. But make sure cursor is really not visible.
        if (!settings.cursor.show) {
            cursor.visible = false;
            return;
        }

        intersections = getRayCastIntersections(mouse);
        if (intersections.length > 0) {
            const { point } = intersections[0];
            cursor.visible = settings.cursor.show;
            cursor.position.set(point.x, point.y, point.z);
        }
        else {
            cursor.visible = false;
        }
    }

    // Updates scene objects, and draws the scene
    // TODO: update the camera
    function render() {
        resizeCanvas();
        updateObjects();
        updateAvatarTransparency();
        updateCamera();
        updateSSAO();
        if (!isRallying)
        {
            updateCameraControls();
            controls.update();
        }

        updateCursor();
        throttledPublishCameraXfo();

        if (settings.SSAO.enable) {
            composer.render();
        }
        else {
            renderer.render(scene, camera);
        }
    }
};

vim3d.isolate = function (name) {
    for (var obj of vim3d.objects)
        if (obj.name == name)
            obj.visible = true;
        else
            obj.visible = false;
}

vim3d.setVis = function (name, vis) {
    for (var obj of vim3d.objects)
        if (obj.name == name)
            obj.visible = vis;
}

vim3d.setVisAll = function (vis) {
    for (var obj of vim3d.objects)
        obj.visible = vis;
}

// Helper functions

const colors = [
    "#980000",
    "#FF0000",
    "#D5009B",
    "#FF77FA",
    "#9D00E2",
    "#9289FF",
    "#4700CE",
    "#0089FF",
    "#0FF6FF",
    "#38FFBA",
    "#51E21B",
    "#2CA300",
    "#F7FF26",
    "#FFB700",
    "#F48D00",
    "#7C4300",
]
function uuidToColor(uuid) {
    // we want to get an index for the colors array from our UUID,
    const hexVal = uuid.split('-')[0]
    const uuidPortion = parseInt(hexVal, 16)
    const uuidColorIndex = uuidPortion % colors.length;
    return colors[uuidColorIndex];
}

function getMyUuid() {
    // Lets try and keep a constant UUID (for billing reasons, and
    // also when someone re-connects, they can resume their previous avatar)
    var uuid = localStorage.getItem("uuid");
    if (!uuid) {
        uuid = PubNub.generateUUID();
        localStorage.setItem("uuid", uuid);
    }
    return uuid;
}

function toVec(obj) {
    return new THREE.Vector3(obj.x, obj.y, obj.z);
}

function setVector(dest, src) {
    dest.set(src.x, src.y, src.z);
}

function setQuaternion(dest, src) {
    dest.set(src.x, src.y, src.z, src.w);
}

function stripVector(v) {
    return {
        x: v.x,
        y: v.y,
        z: v.z,
    }
}

function stripQuaternion(q) {
    var sq = stripVector(q)
    sq.w = q.w
    return sq;
}
