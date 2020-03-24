// https://gulpjs.com/
// https://github.com/gulpjs/gulp
// https://stackoverflow.com/questions/24591854/using-gulp-to-concatenate-and-uglify-files
// https://stackoverflow.com/questions/22115400/why-do-we-need-to-install-gulp-globally-and-locally
// https://css-tricks.com/gulp-for-beginners/
// https://github.com/mrdoob/three.js/wiki/Build-instructions

const gulp = require('gulp'),
    gp_concat = require('gulp-concat'),
    gp_rename = require('gulp-rename'),
    gp_uglify = require('gulp-uglify-es').default;

const srcFiles = [
    'js/index.js',
    'js/keyInput.js',
    'node_modules/dat.gui/build/dat.gui.js',
    'node_modules/three/build/three.js',
    'node_modules/three/examples/js/libs/stats.min.js',
    // NOTE: these controls eat up the touchmove 'node_modules/three/examples/js/controls/OrbitControls.js', 
    // VVV Replaced with js/CustomOrbitControls (in which the touchmove has been modified) VVV
    'js/CustomOrbitControls.js',
    'node_modules/three/examples/js/controls/TrackballControls.js', 

    // Renderer effects
    'node_modules/three/examples/js/shaders/CopyShader.js',
    'node_modules/three/examples/js/postprocessing/EffectComposer.js',
    'node_modules/three/examples/js/postprocessing/ShaderPass.js',
    'node_modules/three/examples/js/math/SimplexNoise.js',
    'node_modules/three/examples/js/shaders/SSAOShader.js',
    'node_modules/three/examples/js/postprocessing/SSAOPass.js',

    // Scene loaders
    'node_modules/three/examples/js/loaders/FBXLoader.js',
    'node_modules/three/examples/js/loaders/ColladaLoader.js',
    'node_modules/three/examples/js/loaders/GCodeLoader.js',
    'node_modules/three/examples/js/loaders/GLTFLoader.js',
    'node_modules/three/examples/js/loaders/OBJLoader.js',
    'node_modules/three/examples/js/loaders/PCDLoader.js',
    'node_modules/three/examples/js/loaders/PDBLoader.js',
    'node_modules/three/examples/js/loaders/PLYLoader.js',
    'node_modules/three/examples/js/loaders/STLLoader.js',
    'node_modules/three/examples/js/loaders/TDSLoader.js',
    'node_modules/three/examples/js/loaders/MTLLoader.js',
    'js/three-mesh-bvh.js',
    'js/G3DLoader.js'
];

gulp.task('build', function(){
    return gulp.src(srcFiles)
        .pipe(gp_concat('vim-3d-viewer.js', {
            newLine:'\n;' // the newline is needed in case the file ends with a line comment, the semi-colon is needed if the last statement wasn't terminated
        }))       
        .pipe(gulp.dest('dist'));
});

gulp.task('dist', function(){
    return gulp.src(srcFiles)
        .pipe(gp_concat('vim-3d-viewer.js', {
            newLine:'\n;' // the newline is needed in case the file ends with a line comment, the semi-colon is needed if the last statement wasn't terminated
        }))
        .pipe(gulp.dest('dist'))
        .pipe(gp_rename('vim-3d-viewer.min.js'))
        .pipe(gp_uglify())
        .pipe(gulp.dest('dist'));
});

gulp.task('watch', function() {
    gulp.watch(srcFiles, gulp.series('build'));
});

