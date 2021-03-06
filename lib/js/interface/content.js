import angular from 'angular';
import npmApi from '../npm/npm-api.js';
const moduleName = 'npm-ui.content';

angular.module(moduleName, [
  npmApi
])
.controller('ContentController', /*@ngInject*/ function ContentController($state, $stateParams, $rootScope, $scope, $log, npmGlobal, npm) {

  const unregisterShellSelectedPackages = $rootScope.$on('shell:selected-packages', (eventInformation, data) => {
        //selected packages could be multiple, just get only the first one in array
        if (data &&
          data[0]) {
          //update package infos for view
          this.loadPackagesInfos(data[0].name);
        }
      })
      , unregisterTopBarActiveLinkListener = $rootScope.$on('top-bar:active-link', (eventInfo, data) => {
      //if selected package and clicked "update package" OR "install latest" OR "uninstall"
      if (data &&
        data.link === '2' ||
        data.link === '3' ||
        data.link === '5') {
        this.showLoadingSelectedRow = true;
      } else {
        this.showLoadingSelectedRow = false;
      }
    })
    , unregisterInstallVersionPackageListener = $rootScope.$on('top-bar:installing-version-package', () => {
        //while selected package and clicked "install release" and clicked prompt dialog button "ok" (while literally installing package new release)
        this.showLoadingSelectedRow = true;
      })
    , unregisterInstallVersionPackageErrorListener = $rootScope.$on('top-bar:installing-version-package-error', () => {
        //while selected package and clicked "install" + version, if no version available it shows an error message and we must remove active loading status from that package row in table
        $scope.$apply(() => {
          this.showLoadingSelectedRow = false;
        });
      })
    , unregisterLeftBarDeleteSelectedProjectListener = $rootScope.$on('left-bar:delete-selected-project', () => {

      this.packageInformations = [];
      this.goBackHome = true;
    })
    , unregisterLeftBarSelectProjectListener = $rootScope.$on('left-bar:select-project', (eventInformation, payload) => {

        $log.info('Selected project payload', payload);

        if (!this.loading ||
          this.loaded) {

          if (payload &&
          payload.path) {

            if (typeof npm.npmGlobal === 'function' &&
              typeof npm.npmInFolder === 'function') {

              this.loading = true;
              this.loaded = false;
              this.goBackHome = false;
              this.showLoadingSelectedRow = false;
              this.packageViewInfos = false;

              let npmPromise;

              if (payload.path === npmGlobal) {
                this.isGlobalProject = true;
                npmPromise = npm.npmGlobal();
              } else {
                this.isGlobalProject = false;
                npmPromise = npm.npmInFolder(payload.path);
              }

              npmPromise.then(npmInFolder =>
                npmInFolder.listOutdated()
                .then(infos => {

                  $scope.$apply(() => {
                    this.packageInformations = infos;
                    this.tableOrderBy = ['name'];
                    this.loaded = true;
                  });
                })
                .catch(error => {

                  $scope.$apply(() => {
                    this.packageInformations = false;
                  });
                  $log.error(error);
                }))
              .catch(error => {

                $scope.$apply(() => {
                  this.packageInformations = false;
                });
                $log.error(`Error on npmPomise, content.js: ${error}`);
              });
            } else {
              $log.error('npm.npmGlobal or npm.infolder are not functions ready probably :/ :/ !? :/ content.js');
            }
          } else {
            $log.error('Path is missing in payload, content.js:', payload);
          }
        }
    });

  this.loadPackagesInfos = packageName => {
    let folder = '/'; //not really needed probably

    this.packageViewInfos = false;

    npm.npmInFolder(folder).then(npmInFolder => {
      npmInFolder.view(packageName).then(packageInfos => {
        try {
          $scope.$apply(() => {
            this.packageViewInfos = packageInfos[Object.keys(packageInfos)[0]];
          });
        } catch (e) {
          $scope.$apply(() => {
            this.packageViewInfos = false;
          });
          $log.warn(e);
        }
        $rootScope.$emit('content:selected-package-info', {'package': packageName, 'info': this.packageViewInfos});
      }).catch(err => {
        $scope.$apply(() => {
          this.packageViewInfos = false;
        });
        $log.warn(`Problem with npm view ${packageName} in folder ${folder}`, err);
      });
    }).catch(err => {
      $scope.$apply(() => {
        this.packageViewInfos = false;
      });
      $log.warn(`Problem configuring npm for $ npm view ${packageName} in folder ${folder}`, err);
    });
  };

  this.sortTableBy = by => {
    if (!this.tableOrderBy.includes(by) &&
      !this.tableOrderBy.includes(`-${by}`)) {
      this.tableOrderBy.unshift(by);
    } else if (this.tableOrderBy.includes(by) &&
      !this.tableOrderBy.includes(`-${by}`)) {
      this.tableOrderBy.splice(this.tableOrderBy.indexOf(by), 1);
      this.tableOrderBy.unshift(`-${by}`);
    } else if (this.tableOrderBy.includes(`-${by}`)) {
      this.tableOrderBy.splice(this.tableOrderBy.indexOf(by), 1);
    }
  };
  //array of selected packages in table, we must init the array
  this.selectedPackages = [];

  if ($stateParams &&
  $stateParams.project) {
    $rootScope.$emit('left-bar:select-project', {
      'path': $stateParams.project.path,
      'rawData': $stateParams.project
    });
  }
  $scope.$on('$destroy', () => {

    unregisterInstallVersionPackageListener();
    unregisterInstallVersionPackageErrorListener();
    unregisterTopBarActiveLinkListener();
    unregisterLeftBarDeleteSelectedProjectListener();
    unregisterLeftBarSelectProjectListener();
    unregisterShellSelectedPackages();
  });
});

export default moduleName;
