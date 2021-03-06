(function (angular, _, $, React, OwlTableReact) {
	'use strict';

	function owlTableService ($http, $rootScope, $filter, $modal, owlConstants, owlResource, owlUtils, owlFilter) {
		var unrenderedTable;

		var service = {
			tables: [],
			data: [],
			pageData: [],
			filteredData: [],
			columns: [],
			options: {
				sort: {
					column: 'id',
					order: 'asc'
				}
			},
			renderedTable: {},
			page: 1,
			pages: 1,
			total: 0,
			count: owlConstants.defaults.PER_PAGE,
			hasChangedData: false,
			filteringEnabled: false
		};

		service.lockedCells = [];

		var defaults = {
			options: {
				sort: {
					column: 'id',
					order: 'asc'
				},
				saveCallbacks: {
					success: _.noop,
					error: _.noop
				}
			}
		};

		service.initialize = function (settings) {
			//this.data = settings.data;
			this.columns = settings.columns;
			this.childColumns = settings.childColumns;
			this.options = _.defaults(settings.options, defaults.options);

			_.forEach(this.columns, function (column) {
				if (typeof column.visible === 'undefined') {
					column.visible = true;
				}
			});

			this.data = settings.data = this.sorted(settings.data);

			unrenderedTable = React.createElement(OwlTableReact, {
				data: settings.data,
				columns: settings.columns,
				childColumns: settings.childColumns,
				tacky: settings.options.tacky,
				lockedCells: [],
				addFilter: function (column) {
					column.filters.push({});

					service.renderedTable.setProps({
						columns: service.columns
					});
				},
				removeFilter: function (column, index) {
					column.filters.splice(index, 1);
					service.renderedTable.setProps({
						columns: service.columns
					});
				},
				massUpdate: settings.options.massUpdate,
				sortClickHandler: this.sortClickHandler,
				filterDidChange: this.filterDidChange.bind(this),
				filteringEnabled: this.filteringEnabled
			});

			return this;
		};

		service.sortClickHandler = function (field, reverse) {
			if (typeof reverse !== 'undefined' && reverse !== null && reverse !== '') {
				service.options.sort.order = reverse === true ? 'desc' : 'asc';
			}

			service.options.sort.column = field;
			service.sort();
		};

		service.renderInto = function (container) {
			this.renderedTable = React.render(unrenderedTable, container);
			this.container = container;
			return this.renderedTable;
		};

		service.registerTable = function (id, callback) {
			this.tables.push({
				id: id,
				callbacks: $.Callbacks().add(callback)
			});
		};

		service.currentPageOfData = function (data) {
			var pageOfData;
			var startIndex = (this.page - 1) * this.count;
			var endIndex = this.page * this.count;

			endIndex = endIndex > 0 ? endIndex : 1;

			if (typeof data !== 'undefined') {
				pageOfData = data.slice(startIndex, endIndex);
			} else if (this.filteringEnabled) {
				pageOfData = this.filteredData.slice(startIndex, endIndex);
			} else {
				pageOfData = this.data.slice(startIndex, endIndex);
			}
			return pageOfData;
		};

		service.sorted = function (data) {
			var reverse = this.options.sort.order === 'desc' ? true : false;
			var sortColumn = _.where(this.columns, {'field': this.options.sort.column})[0];
			if (typeof sortColumn !== 'undefined') {
				if (sortColumn.type.indexOf('select') > -1) {
					return $filter('orderBy')(data, function (datum) {
						var option = _.where(sortColumn.options, {'value': datum[sortColumn.field]})[0];
						var text = (!option ? '' : $('<p>').html(option.text).text());
						return text;
					}, reverse);
				}
			}
			return $filter('orderBy')(data, this.options.sort.column, reverse);
		};

		service.sort = function () {
			this.updateData(this.sorted(this.data));
		};

		service.syncDataFromView = function (row, column, value) {
			var modelRow = _(this.data).where({id: row.id}).first();

			//if not found it is probably a child record, so check the children
			if (typeof modelRow === 'undefined') {
				var modelRow = _.find(this.data, function (data) {
					return _(data.children).where({id: row.id}).first();
				});
			}

			modelRow[column.field] = value;
			$rootScope.$apply((function () {
				this.hasChangedData = true;
			}).bind(this));
		};

		service.updateData = function (newData) {
			if (typeof newData !== 'undefined') {

				this.data = newData;
				this.paginateNoApply({
					total: newData.length
				});
				this.renderedTable.setProps({
					data: this.currentPageOfData()
				});
			}
		};

		service.customizeColumns = function () {
			var self = this;

			var modal = $modal.open({
				templateUrl: 'partials/columnModal.html',
				controller: ['$scope', '$modalInstance', 'columns', function ($scope, $modalInstance, columns) {
					$scope.columns = columns;
					$scope.visibleColumns = _.filter(columns, function (column) {
						if (typeof column.visible === 'undefined') {
							column.visible = true;
						}

						return column.visible !== false;
					});

					$scope.toggleColumn = function (column) {
						column.visible = !column.visible;
					};
					$scope.ok = function () {
						$modalInstance.close($scope.columns);
					};
				}],
				size: 'lg',
				resolve: {
					columns: function () {
						return self.columns;
					}
				},
				backdrop: 'static',
			});

			modal.result.then(function (columns) {
				$rootScope.$broadcast('owlTableColumnsCustomized', columns);
				self.updateColumns(columns);
			});
		};

		service.updateColumns = function (newColumns) {
			this.columns = newColumns;
			this.renderedTable.setProps({
				columns: this.columns
			});
		};

		service.updateChildColumns = function (newChildColumns) {
			if (typeof newChildColumns !== 'undefined') {
				this.childColumns = newChildColumns;
				this.renderedTable.setProps({
					childColumns: this.childColumns
				});
			}
		};

		service.updateOptions = function (newOptions) {
			this.options = newOptions;
			this.renderedTable.setProps({
				tacky: this.options.tacky
			});
		};

		service.updateTacky = function (newTacky) {
			this.options.tacky = newTacky;
		};

		service.clearAllChanged = function (callback) {
			this.renderedTable.setState({
				changedData: {}
			});

			this.hasChangedData = false;

			if (typeof callback !== 'undefined') {
				callback();
			}
		};

		service.ajaxError = function (message) {
			$rootScope.$broadcast('owlTableAjaxError', [message]);
		};

		service.tableWithId = function (id) {
			return this.tables.map(function (table) {
				if (table.id === id) {
					return table;
				}
			});
		};

		service.setCount = function (count) {
			this.count = count;
		};

		service.nextPage = function () {
			if (this.page < this.pages) {
				this.page += 1;
			}

			this.renderedTable.setProps({
				data: this.currentPageOfData(),
				pageChanged: true
			});
		};

		service.prevPage = function () {
			if (this.page > 1) {
				this.page -= 1;
			}

			this.renderedTable.setProps({
				data: this.currentPageOfData(),
				pageChanged: true
			});
		};

		service.paginateNoApply = function (settings) {
			if (typeof(settings.count) !== 'undefined') {
				this.count = settings.count;
			}

			this.pages = Math.ceil(settings.total / this.count);
			this.total = settings.total;
			this.page = 1;
		};

		// enables client-side pagination.
		service.paginate = function (settings) {
			if (!$rootScope.$$phase) {
				$rootScope.$apply((function () {
					this.paginateNoApply(settings);
				}).bind(this));
			}
		};

		service.saveAllChanged = function () {
			var data = {};
			var self = this;

			this.throwIfNoSaveRoute();

			if (typeof this.options.ajaxParams !== 'undefined') {
				data = _.clone(this.options.ajaxParams.post);
			}

			data.data = this.renderedTable.state.changedData;

			// should call my own ajax service
			return $http({
				method: 'post',
				url: this.options.saveUrl,
				data: data
			}).then(
				function onSuccess (response) {
					self.renderedTable.setState({
						changedData: {}
					});
					self.hasChangedData = false;

					self.options.saveCallbacks.success(response);
				},
				function onError (response) {
					self.options.saveCallbacks.error(response);
				}
			);
		};

		service.saveRow = function (column, row, value) {
			var params;
			var successCallback = this.options.saveCallbacks.success;
			var errorCallback = this.options.saveCallbacks.error;

			this.throwIfNoSaveRoute();

			if (typeof this.options.ajaxParams !== 'undefined') {
				params = this.options.ajaxParams.post || '';
			}

			var resource = {
				id: row.id,
				column: column.field,
				value: value,
				saveUrl: this.options.saveUrl,
				params: params
			};

			return owlResource(resource).save().then(successCallback, errorCallback);
		};

		service.lockCell = function (rowId, columnField) {
			var ourRow = owlUtils.firstRowIfExists(
				_.filter(this.data, function (datum) {
					/* jshint ignore:start */
					return datum.id == rowId;
					/* jshint ignore:end */
				})
			);

			if (ourRow) {
				if (typeof ourRow.lockedCells === 'undefined') {
					ourRow.lockedCells = [];
				}

				ourRow.lockedCells.push(columnField);
				ourRow.lockedCells = _.uniq(ourRow.lockedCells);
			}
		};

		service.unlockCell = function (rowId, columnField) {
			var ourRow = owlUtils.firstRowIfExists(
				_.filter(this.data, function (datum) {
					/* jshint ignore:start */
					return datum.id == rowId;
					/* jshint ignore:end */
				})
			);

			ourRow.lockedCells = _.without(ourRow.lockedCells, columnField);
		};

		service.isDirty = function () {
			return this.hasChangedData || !_.isEmpty(this.renderedTable.state.changedData);
		};

		service.throwIfNoSaveRoute = function () {
			if (typeof(this.options.saveUrl) === 'undefined' || this.options.saveUrl === null || this.options.saveUrl === '') {
				throw owlConstants.exceptions.noSaveRoute;
			}
		};

		service.toggleFiltering = function () {
			this.filteringEnabled = !this.filteringEnabled;

			if (this.filteringEnabled) {
				this.filteredData = _.filter(this.data, function () { return true; });
				this.renderedTable.setProps({
					filteringEnabled: this.filteringEnabled,
				});
			} else {
				this.filteredData = [];
				this.renderedTable.setProps({
					filteringEnabled: this.filteringEnabled,
					data: this.currentPageOfData()
				});
			}
		};

		service.filterDidChange = function (filter, columnField) {
			if (typeof columnField !== 'undefined') {
				var column = _.where(this.columns, {'field': columnField});
				column[0].filters[0] = filter;
			}

			var rows = owlFilter.filterTable(this.data, this.columns);

			if (!owlFilter.hasNoFilters(this.columns)) {
				this.setFilteredData(rows).andRender();
			} else {
				this.setFilteredData().andRender();
			}
		};

		service.setFilteredData = function (filteredData) {
			if (typeof filteredData === 'undefined' || !filteredData) {
				// This copies the array of references so we can mutate it
				this.filteredData = _.filter(this.data, function () { return true; });
			} else if (_.isFunction(filteredData)) {
				this.filteredData = filteredData();
			} else if (_.isArray(filteredData)) {
				this.filteredData = filteredData;
			} else {
				throw owlConstants.exceptions.badData;
			}

			this.paginate({
				total: this.filteredData.length
			});

			return this;
		};

		service.andRender = function () {
			var data;
			this.renderedTable.setProps({
				data: this.currentPageOfData()
			});
		};

		service.prepareForPrinting = function () {
			this.renderedTable.setProps({
				data: this.data,
				printMode: true
			});
		};

		service.finishedPrinting = function () {
			this.renderedTable.setProps({
				data: this.currentPageOfData(),
				printMode: false
			});
		};

		return service;
	}

	owlTableService.$inject = [
	'$http',
	'$rootScope',
	'$filter',
	'$modal',
	'owlConstants',
	'owlResource',
	'owlUtils',
	'owlFilter'];

	angular.module('owlTable')
		.service('owlTable',
			owlTableService
		);

})(window.angular, window._, window.jQuery, window.React, window.OwlTableReact);
