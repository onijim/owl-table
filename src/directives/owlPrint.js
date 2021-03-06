(function (angular) {
	'use strict';

	function owlPrintDirective($window, owlTable, $timeout) {
		var printSection = document.getElementById('owlPrintSection');

		if (!printSection) {
			printSection = document.createElement('div');
			printSection.id = 'owlPrintSection';
			document.body.appendChild(printSection);
		}

		function link (scope, elem, attrs, tableCtrl) {
			elem.on('click', function () {
				elem.tooltip({
					title: 'Please wait...',
					trigger: 'manual',
					placement: 'right'
				}).tooltip('show');

				var elemToPrint = document.getElementById(attrs.printElementId);

				$timeout(function () {
					if (elemToPrint) {
						printElement(elemToPrint);
					}
				}, 200);
			});

			// This is for Chrome and other browsers that don't support onafterprint
			if ($window.matchMedia) {
				var mediaQueryList = $window.matchMedia('print');
				mediaQueryList.addListener(function (mql) {
					if (!mql.matches) {
						afterPrint();
					}
				});
			}

			if (_.isUndefined(tableCtrl.tableWillPrint)) {
				tableCtrl.tableWillPrint = _.noop;
			}

			if (_.isUndefined(tableCtrl.tableDidPrint)) {
				tableCtrl.tableDidPrint = _.noop;
			}

			$window.onafterprint = afterPrint;

			var printElement = function (elem) {
				var domClone;

				tableCtrl.tableWillPrint();

				domClone = elem.cloneNode(true);
				printSection.appendChild(domClone);
				$window.print();
			};

			var afterPrint = function () {
				elem.tooltip('hide');
				tableCtrl.tableDidPrint();
				printSection.innerHTML = '';
			};
		}

		return {
			link: link,
			restrict: 'A',
			require: '^owlTable'
		};
	}

	owlPrintDirective.$inject = ['$window', 'owlTable', '$timeout'];
	angular.module('owlTable').directive('owlPrint', owlPrintDirective);

})(window.angular);
