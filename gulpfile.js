var gulp = require('gulp'),
    uglify = require('gulp-uglify'),
    imagemin = require('gulp-imagemin'),
    htmlmin = require('gulp-htmlmin'),
    cleanCSS = require('gulp-clean-css');

var browserSync = require('browser-sync').create(),
    reload = browserSync.reload;

/*Minify CSS files*/
gulp.task('cssmin', function() {
  gulp.src('src/css/*.css')
    .pipe(cleanCSS())
    .pipe(gulp.dest('app/css/'))
    .pipe(reload({stream: true}));
});

/*Minify JS files*/
gulp.task('jsmin', function() {
  gulp.src('src/js/*.js*')
    .pipe(uglify())
    .pipe(gulp.dest('app/js/'))
    .pipe(reload({stream: true}));
});

/*Compress images*/
gulp.task('img-compress', function() {
  gulp.src('src/css/images/*')
    .pipe(imagemin())
    .pipe(gulp.dest('app/css/images'))
    .pipe(reload({stream: true}));
});

/*Minify html files*/
gulp.task('htmlmin', function() {
  gulp.src('src/*.html')
    .pipe(htmlmin({collapseWhitespace: true}))
    .pipe(gulp.dest('app/'))
    .pipe(reload({stream: true}));
});

gulp.task('browser-sync', function() {
    browserSync.init({
        server: {
            baseDir: "app",
            index: "index.html",
             online: true
        }
    });

    gulp.watch(['src/css/images/*'], ['img-compress']);
    gulp.watch(['src/css/*.css'], ['cssmin']);
    gulp.watch(['src/js/*.js','src/js/*.json'], ['jsmin']);
    gulp.watch(['src/*.html'],['htmlmin', reload]);
});

gulp.task('default', ['jsmin','img-compress', 'cssmin','htmlmin']);