function owlTableDirective ($http, owlTableService) {
	return {
		restrict: 'EA',
		scope: {
			data: '=',
			columns: '=',
			save: '@'
		},
		templateUrl: 'partials/table.html',
		controllerAs: 'owlCtrl',
		compile: function (tElem, tAttrs) {
			owlTableService.registerTable(tElem[0].id);

			return function link (scope, elem, attrs) {
				var table;
				var rendered;
				var container = elem.find('.owl-react-container')[0];

				table = React.createElement(OwlTableReact, {
					data: scope.data,
					columns: scope.columns
				});

				rendered = React.render(table, container);

				scope.$watchCollection('data', function (newValue, oldValue) {
					if (newValue !== oldValue) {
						rendered.setProps({
							data: newValue
						});
					}
				});

				elem.on('owlTableUpdated', function (event) {
					var updatedRow = event.result;

					// Could ajax the saved row to the server here.

					// Put it into the scope.data array. Is this ugly? Yes.
					$.grep(scope.data, function (e) { return e.id === updatedRow.id; })[0] = updatedRow;

					event.stopPropagation();
				});

				scope.saveButtonClicked = function (event) {
					scope.saving = true;

					// Should abstract this into a service or delegate it to user provided thing
					$http({
						method: 'post',
						url: scope.save,
						data: {
							data: rendered.state.changedData
						}
					}).then(function (response) {
						scope.saving = false;
						console.log('save successful');
					});

					rendered.setState({
						changedData: {}
					});
				};
			};
		},
		controller: function ($scope) {
			this.owlTable = owlTableService;

			this.nextPage = function () {
				owlTableService.nextPage();
				$scope.$emit('owlNextPage');
			};

			this.prevPage = function () {
				owlTableService.prevPage();
				$scope.$emit('owlPrevPage');
			};
		}
	};
}

function owlPagination (owlTableService) {
	return {
		restrict: 'EA',
		require: '^owlTable',
		templateUrl: 'partials/pagination.html',
		compile: function (tElem, tAttrs) {
			return function link (scope, elem, attrs) {

			};
		}
	};
}

function owlFilterControls (owlTableService) {
	return {
		restrict: 'EA',
		require: '^owlTable',
		templateUrl: 'partials/filter.html',
		compile: function (tElem, tAttrs) {
			return function link (scope, elem, attrs) {};
		}
	};
}

function owlExportControls (owlTableService) {
	return {
		restrict: 'EA',
		require: '^owlTable',
		templateUrl: 'partials/export.html',
		compile: function (tElem, tAttrs) {
			return function link (scope, elem, attrs) {};
		}
	};
}

angular.module('owlTable')
	.directive('owlTable', ['$http', 'owlTableService', owlTableDirective])
	.directive('owlPagination', ['owlTableService', owlPagination])
	.directive('owlFilterControls', ['owlTableService', owlFilterControls])
	.directive('owlExportControls', ['owlTableService', owlExportControls]);
