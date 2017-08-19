  const gulp = require('gulp'), // Сам сборщик Gulp
      sass = require('gulp-sass'), // Пакет компиляции SASS/SCSS
      mmq = require('gulp-merge-media-queries'), // Плагин, соединющий медиа-запросы
      pug = require('gulp-pug'), // Пакет компиляции Pug (бывш. Jade)
      browserSync = require('browser-sync'), // Запуск локального сервера
      concat = require('gulp-concat'), // Пакет конкатенации файлов
      uglifyjs = require('gulp-uglifyjs'), // Пакет минификации файлов JavaScript
      cssnano = require('gulp-cssnano'), // Пакет минификации файлов CSS
      rename = require('gulp-rename'), // Переименовывание файлов
      uncss = require('gulp-uncss'), // Очищает все неиспользуемые стили
      del =   require('del'), // Удаление файлов директории
      imagemin = require('gulp-imagemin'), // Пакет минификации изображений (в зависимостях также идут дополнительные пакеты)
      cache = require('gulp-cache'), // Работа с кэшом
      autoprefixer = require('gulp-autoprefixer'), // Пакет расстановки вендорных перфиксов
      plumber = require('gulp-plumber'), // Предотвращает разрыв pipe'ов, вызванных ошибками gulp-плагинов
      notify = require('gulp-notify'), // Выводит уведомления
      eslint = require('gulp-eslint'), // Линтинг JS-кода
      importFile = require('gulp-file-include'), // Импорт файлов (@@include ('path/to/file'))
      nicehtml = require('gulp-html-beautify'),
      sourcemaps = require('gulp-sourcemaps'),
      spritesmith = require('gulp.spritesmith');

  //sass compile 
  gulp.task('sass', () => {
      return gulp.src('app/scss/**/*.scss') // В этом файле хранятся основные стили, остальные следует импортировать в него
          .pipe(sourcemaps.init())
          .pipe(plumber())
          .pipe(sass({
              outputStyle: ':nested'
          }).on('error', sass.logError))
          .pipe(sourcemaps.write())
          .on('error', notify.onError({
              title: 'SCSS',
              message: '<%= error.message %>'
          }))
          .pipe(autoprefixer(['last 15 versions', '> 1%', 'ie 8'], { cascade: false }))
          .pipe(gulp.dest('app/css'));
  });

  gulp.task('css', ['sass'], () => {
      return gulp.src('app/css/style.css')
          .pipe(mmq())
          .pipe(cssnano())
          .pipe(rename({
              suffix: '.min'
          }))
          .pipe(gulp.dest('app/css'))
          .pipe(browserSync.reload({
              stream: true
          }));
  });

  

  // common_sprites
  gulp.task('sprite', function() {
    var spriteData = 
        gulp.src('app/images/sprites/*.*') // путь, откуда берем картинки для спрайта
            .pipe(spritesmith({
                imgName: 'sprite.png',
                cssName: 'sprite.scss',
            }));
  
            spriteData.img.pipe(gulp.dest('../app/images/sprites')); // путь, куда сохраняем картинку
    spriteData.css.pipe(gulp.dest('../app/scss')); // путь, куда сохраняем стили
});
//

  // Чистим неиспользуемые стили
  gulp.task('uncss', () => {
      return gulp.src('app/css/*.css')
          .pipe(uncss({
              html: ['app/*.html']
          }))
          .pipe(gulp.dest('app/css'));
  });


  gulp.task('pug', () => {
      gulp.src('app/pug/pages/*.pug')
          .pipe(plumber())
          .pipe(plumber({
              errorHandler: notify.onError({
                  title: 'PUG',
                  message: '<%= error.message %>'
              })
          }))
          .pipe(pug({
              pretty: true
          }))
          .pipe(nicehtml())
          .pipe(gulp.dest('app/'))
          .pipe(browserSync.reload({
              stream: true
          }));
  });


  gulp.task('eslint', () => {
      return gulp.src(['app/js/common.js'])
          .pipe(eslint({
              fix: true,
              rules: {
                  'no-undef': 0 // делаем так, чтобы ESLint не ругался на непоределённые переменные (в т.ч. глобальные, библиотек)
              },
              globals: ['$'] // определяем глобальные переменные (самое распространённое - jQuery)
          }))
          .pipe(eslint.format());
  });

  // Подключаем JS файлы результирующего файла common.js, конкатенируем и минифицируем
  gulp.task('scripts', ['eslint'], () => {
      return gulp.src('app/js/common.js') // основной файл наших сценариев
          .pipe(plumber({
              errorHandler: notify.onError({
                  title: 'JS',
                  message: '<%= error.message %>'
              })
          }))

      .pipe(uglifyjs()) // минификация JS
          .pipe(rename({
              suffix: '.min'
          }))
          .pipe(gulp.dest('app/js'))
          .pipe(browserSync.reload({
              stream: true
          }));
  });




  // Подключаем JS файлы бибилотек из директории 'app/libs/', установленные bower'ом, конкатенируем их и минифицируем
  gulp.task('jsLibs', ['scripts'], function() {
      return gulp.src([
              //здесь все js библиотеки
              'app/libs/slick/slick.min.js',
              'app/libs/validate/validate.min.js',
              'app/libs/magnific-popup/dist/jquery.magnific-popup.min.js'
              //здесь все js библиотеки
          ])
          .pipe(concat('libs.min.js'))
          .pipe(uglifyjs()) // Минимизировать весь js (на выбор)
          .pipe(gulp.dest('app/js/'))
          .pipe(browserSync.reload({
              stream: true
          }));
  });


  // Минифицируем изображения и кидаем их в кэш
  gulp.task('img', () => {
      return gulp.src('app/images/**/*')
          .pipe(cache(imagemin([imagemin.gifsicle(), imagemin.jpegtran(), imagemin.optipng()])))
          .pipe(gulp.dest('dist/img'));
  });

  // Запускаем наш локальный сервер из директории 'app/'
  gulp.task('browser-sync', () => {
      browserSync({
          server: {
              baseDir: 'app/'
          },
          notify: false
      });
  });

  gulp.task('default', ['css', 'pug', 'jsLibs', 'scripts', 'browser-sync'], function() {
      gulp.watch('app/scss/**/*.scss', ['css']);
      gulp.watch('app/pug/**/*.pug', ['pug']);
      gulp.watch(['app/js/common.js'], ['scripts']);
      gulp.watch('app/js/libs.js', ['jsLibs']);
      gulp.watch('app/*.html', browserSync.reload);
  });


  // Очищаем директорию билда 'dist/'
  gulp.task('clean', () => {
      return del.sync('dist/**/*');
  });

  // Чистим кэш изображений (вообще весь кэш)
  gulp.task('clear', () => {
      return cache.clearAll();
  });


  // Собираем наш билд в директорию 'dist/'
  gulp.task('build', ['clean', 'img', 'css', 'pug', 'scripts', 'eslint'], () => {

      // Собираем CSS
      var buildCss = gulp.src('app/css/style.min.css')
          .pipe(gulp.dest('dist/css'));

      // Собираем шрифты
      var buildFonts = gulp.src('app/fonts/**/*')
          .pipe(gulp.dest('dist/fonts'));

      // Собираем JS
      var buildJs = gulp.src('app/js/*.min.js')
          .pipe(gulp.dest('dist/js'));

      // Собираем HTML
      var buildHtml = gulp.src('app/*.html')
          .pipe(gulp.dest('dist'));
  });

