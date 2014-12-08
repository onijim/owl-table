describe 'the owl table directives', ->

	$rootScope = null
	$compile = null
	$timeout = null
	scope = null
	element = null

	service = null
	ajaxService = null

	beforeEach module 'owlTable'
	beforeEach module 'owlTablePartials'

	beforeEach inject (_$rootScope_, _$compile_, _$timeout_, $q, owlTable, owlResource) ->
		$rootScope = _$rootScope_
		$compile = _$compile_
		$timeout = _$timeout_

		service = owlTable
		ajaxService = owlResource

		scope = $rootScope.$new()

		scope.data = []
		scope.columns = []
		scope.options = {}

		deferred = $q.defer()
		deferred.resolve('foo')

		spyOn owlTable, 'registerTable'
		spyOn owlTable, 'updateData'
		spyOn owlTable, 'updateColumns'
		spyOn owlTable, 'syncDataFromView'
		spyOn owlTable, 'nextPage'
		spyOn owlTable, 'prevPage'
		spyOn owlTable, 'saveAllChanged'
		spyOn(owlTable, 'saveRow').and.returnValue deferred.promise

	#	spyOn ajaxService
	#	spyOn ajaxService, 'save'

		scope.columns.push {type: 'text', field: 'custom_2000000', title: 'Custom 2000000'} for column in [0..10]
		scope.options =
			tacky:
				top:
					true

		element =
			'<owl-table data="data" options="options" columns="columns"></owl-table>'
		element = angular.element element

	describe 'owlTable directive', ->
		describe 'initializes', ->
			isolateScope = null
			beforeEach ->
				element = $compile(element)(scope)
				scope.$digest()
				isolateScope = element.isolateScope()
			it 'and registers with the table service', ->
				expect(service.registerTable).toHaveBeenCalled()
			it 'has valid default scope values', ->
				expect(isolateScope.loading).toBe true
				expect(isolateScope.takingAWhile).toBe false

		describe 'ajax loading indicators etc', ->
			isolateScope = null
			beforeEach ->
				element = $compile(element)(scope)
				scope.$digest()
				isolateScope = element.isolateScope()
			it 'sets a timeout to bring up a taking a while message', ->
				$timeout.flush()
				expect(isolateScope.takingAWhile).toBe true

		describe 'its isolate scope variables', ->
			isolateScope = null
			beforeEach ->
				element = $compile(element)(scope)
				scope.$digest()
				isolateScope = element.isolateScope()

			it 'creates 2 table elements', ->
				expect(element.find('table').length).toEqual 2

			describe 'the fields you pass to the directive', ->
				describe 'data', ->
					data = null;
					beforeEach ->
						data = isolateScope.data
					it 'should always exist', ->
						expect(data).toBeDefined
					it 'should match what is passed in', ->
						expect(data).toEqual scope.data
					it 'needs to be an array', ->
						expect(data.constructor).toEqual Array
					it 'tells table service to update its data', ->
						test = foo: 'bar'
						scope.data.push test
						scope.$digest()
						expect(service.updateData).toHaveBeenCalled()
				describe 'columns', ->
					columns = null;
					beforeEach ->
						columns = isolateScope.columns
					it 'should always exist', ->
						expect(columns).toBeDefined
					it 'should match what is passed in', ->
						expect(columns).toEqual scope.columns
					it 'needs to be an array', ->
						expect(columns.constructor).toEqual Array
					it 'tells table service to update the column list', ->
						test = foo: 'bar'
						scope.columns.push test
						scope.$digest()
						expect(service.updateColumns).toHaveBeenCalled()
					describe 'its column objects', ->
						column = null
						beforeEach ->
							column = isolateScope.columns.pop()
						it 'specifies the type - ie type: "text"', ->
							expect(column.type).toBeDefined()
							expect(column.type).toEqual "text"
						it 'specifies the database field - ie field: "custom_2000000"', ->
							expect(column.field).toBeDefined()
							expect(column.field).toEqual "custom_2000000"

		describe 'when its table view updates', ->
			isolateScope = null
			beforeEach ->
				element = $compile(element)(scope)
				scope.$digest()
				isolateScope = element.isolateScope()

			describe 'responds to the owlTableUpdated event', ->
				triggerUpdate = () ->
					element.trigger 'owlTableUpdated', [{foo: 'bar'}, {bar: 'bin'}, 'baz']
					scope.$digest()

				it 'sends the new data to the table service', ->
					triggerUpdate()
					expect(service.syncDataFromView).toHaveBeenCalled()

				describe 'when individual record saving is on', ->
					beforeEach ->
						isolateScope.options.saveIndividualRows = true
						triggerUpdate()

					it 'tells owlresource to save the row', ->
						expect(service.saveRow).toHaveBeenCalled()

					describe 'the Saved indicator', ->
						it 'is turned on when the row is saved', ->
							expect(isolateScope.saved).toBe true
						it 'turns off after a timeout', ->
							$timeout.flush()
							expect(isolateScope.saved).toBe false

	describe 'owlTable controller', ->
		isolateScope = null
		beforeEach ->
			element = $compile(element)(scope)
			scope.$digest()
			isolateScope = element.isolateScope()

		describe 'when its nextPage method is called', ->
			it 'should tell the table service to goto next page', ->
				isolateScope.owlCtrl.nextPage()
				expect(service.nextPage).toHaveBeenCalled()
		describe 'when its prevPage method is called', ->
			it 'should tell the table service to goto previous page', ->
				isolateScope.owlCtrl.prevPage()
				expect(service.prevPage).toHaveBeenCalled()
		describe 'when the save button is clicked', ->
			beforeEach ->
				element.find('#saveButton').click()
			it 'should tell the table service to save', ->
				expect(service.saveAllChanged).toHaveBeenCalled()
			describe 'the saving indicator', ->
				it 'is turned on', ->
					expect(isolateScope.saving).toBe true
				it 'turns off after a timeout', ->
					$timeout.flush()
					expect(isolateScope.saving).toBe false

	describe 'owlPagination directive', ->
		owlCtrl = null
		beforeEach ->
			element.append '<owl-pagination></owl-pagination>'
			element = $compile(element)(scope)
			scope.$digest()
			owlCtrl = scope.$$childTail.owlCtrl
			spyOn owlCtrl, 'nextPage'
			spyOn owlCtrl, 'prevPage'

		describe 'its buttons', ->
			it 'calls next page on the table controller', ->
				element.find('.owl-next-page').click()
				expect(owlCtrl.nextPage).toHaveBeenCalled()
			it 'calls prev page on the table controller', ->
				element.find('.owl-previous-page').click()
				expect(owlCtrl.prevPage).toHaveBeenCalled()

	describe 'owlExportControls directive', ->
		exportCtrl = null
		beforeEach ->
			element = $compile(element)(scope)
			scope.$digest()
			exportCtrl = element.find('owl-export-controls').scope().exportCtrl
			spyOn(exportCtrl, 'csvHeader').and.callThrough()
		it 'should provide a csvHeader function to ng-csv', ->
			element.find('.owl-export-button-csv').click()
			expect(exportCtrl.csvHeader).toHaveBeenCalled()
