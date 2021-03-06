var OwlInput = React.createClass({
	displayName: 'OwlInput',
	propTypes: {
		column: React.PropTypes.object.isRequired,
		row: React.PropTypes.object,
	},
	keydown: function (event) {
		var node = $(this.getDOMNode());
		event.persist();
		if (this.props.column.type === 'number') {
			if (/\D/.test(String.fromCharCode(event.which))) {
				// invalid
				event.preventDefault();
				node.tooltip('show');
			} else {
				node.tooltip('hide');
			}
		}
		// See handler in table react component
		switch (event.which) {
			case 9:
				break;
			default:
				break;
		}
	},
	inputDidChange: function (event) {
		event.persist();
		this.debouncedInputDidChange(event);
	},
	debouncedInputDidChange: _.debounce(function (event) {
		this.props.tableDidChange(event, this.props.row, this.props.column);
	}, 200),
	transmitSaveEvent: function (event) {
		var node = $(this.getDOMNode());
		var props = this.props;
		var newValue = event.target.value;

		node.trigger('owlTableUpdated', [props.column, props.row, newValue]);

		if (props.column.type !== 'checkbox') {
			this.props.closeCell();
		}
	},
	handleSpecialFields: function (event) {
		event.persist();
		this.props.tableDidChange(event, this.props.row, this.props.column);
		this.transmitSaveEvent(event);
	},
	handleCheckboxChange: function (event) {
		event.persist();

		var newValue = this.refs.checkbox.getDOMNode().checked ? 'Y' : 'N';
		event.target.value = newValue;
		this.props.tableDidChange(event, this.props.row, this.props.column);
		this.transmitSaveEvent(event);
	},
	render: function () {
		var props = this.props;

		var input;
		var options = props.column.options;

		var self = this;

		var optionList;

		function getCheckboxValue (value) {
			var isChecked = false;

			if (!_.isUndefined(value) && value !== '') {
				if (value === 'Y' || value === true) {
					isChecked = true;
				}
			}
			return isChecked;
		}

		// refactor this into factory that makes subcomponents
		// That way we could swap factories out - the below field logic is tailored
		// to legacy code.
		var classNames = 'owl-input';
		switch (props.column.type) {
			case 'number':
			case 'text':
				var containerTd = 'td[data-field="' + props.column.field + '"]';
				input = React.createElement("input", {className: classNames, "data-container": "body", "data-toggle": "tooltip", "data-trigger": "click", "data-placement": "right", title: "Numbers only", type: "text", onBlur: self.transmitSaveEvent, defaultValue: props.value, onKeyPress: self.keydown, formNoValidate: true, noValidate: true, onChange: self.inputDidChange});
				break;
			case 'select': // fall through
			case 'select_one': // fall through
			case 'select_multiple':
				optionList = options.map(function (option, index) {
					var textVal = $('<p>').html(option.text).text();
					return (
						React.createElement("option", {key: index, value: option.value}, 
							textVal
						)
					);
				});

				if (props.column.type === 'select_multiple') {
					var value = !props.value ? props.value : props.value.split("||");

					if (_.isUndefined(value) || !_.isArray(value)) {
						value = [];
					}

					input = React.createElement("select", {onChange: self.handleSpecialFields, className: "swiftbox", multiple: true, defaultValue: value}, 
								optionList
							);
				} else {
					input = React.createElement("select", {onChange: self.handleSpecialFields, className: "swiftbox", defaultValue: props.value}, 
								optionList
							);
				}
				break;
			case 'checkbox':
				input = React.createElement("label", {className: "owl-check-label"}, 
							React.createElement("input", {ref: "checkbox", className: "owl-input", type: "checkbox", onChange: self.handleCheckboxChange, value: "Y", defaultChecked:  getCheckboxValue(props.value) })
						);
				break;
			case 'radio':
				var radioName = props.column.field + '_' + props.row.id;
				optionList = options.map(function (option, index) {
					return (
						React.createElement("div", {key: index, className: "radio"}, 
							React.createElement("label", null, 
								React.createElement("input", {className: "owl-input", type: "radio", onChange: self.transmitSaveEvent, defaultValue: option.value, name: radioName}), 
								React.createElement("span", {dangerouslySetInnerHTML: {__html: option.text}})
							)
						)
					);
				});

				input = React.createElement("div", null, optionList);
				break;
			case 'date':
				input =
					React.createElement("input", {className: "owl-input", defaultValue: props.value, "data-date-format": "mm/dd/yyyy", "data-provide": "datepicker"});
				break;
			case 'time':
				input = React.createElement("input", {className: "owl-input", type: "time", onChange: self.handleSpecialFields, defaultValue: props.value});
				break;
			case 'file':
				input = React.createElement("span", null, " File upload not supported yet ");
				break;
			case 'log':
				input = React.createElement("span", null, " Log field not supported yet ");
				break;
			case 'placeholder':
				input = React.createElement("span", null, " Placeholder ");
				break;
			default:
				input = React.createElement("span", null, " ", props.value, " ");
				console.error('Invalid field type "' + props.column.type + '" for field ' + props.column.field);
		}

		return input;
	},
	componentDidMount: function () {
		var self = this;

		$(self.getDOMNode()).focus();

		if (self.props.column.type === 'date') {
			$(self.getDOMNode()).on('changeDate', function (date) {
				date.target.value = date.format().toUpperCase();
				self.props.tableDidChange(date, self.props.row, self.props.column);
				self.transmitSaveEvent(date);
			});
		}

		if (self.props.column.type === 'number') {
			$(self.getDOMNode()).tooltip();
		}
	},
	componentDidUpdate: function () {
		var self = this;
		if (self.props.column.type === 'date') {
			$(self.getDOMNode()).on('changeData', function (date) {
				date.target.value = date.format().toUpperCase();
				self.props.tableDidChange(date, self.props.row, self.props.column);
				self.transmitSaveEvent(date);
			});
		}
	}
});

var OwlCell = React.createClass({
	displayName: 'OwlCell',
	propTypes: {
		column: React.PropTypes.object.isRequired,
		row: React.PropTypes.object,
		editable: React.PropTypes.bool
	},
	getDefaultProps: function () {
		return {
			open: false,
			editable: true,
			isChild: false,
			isChildColumn: false
		};
	},
	getInitialState: function () {
		return {
			open: false
		};
	},
	open: function () {
		if (!this.state.open) {
			this.setState({
				open: true
			});
		}
	},
	close: function () {
		if (this.state.open) {
			this.setState({
				open: false
			});
		}
	},
	onKeydown: function (event) {
		switch (event.which) {
			case 9:
				break;
		}
	},
	render: function () {
		var props = this.props;
		var td;
		var content;
		var optionText;
		var value = props.row[props.column.field];
		var classes = 'owl-cell-value-label owl-editable';
		var self = this;

		//if its a child row but not a child column dont render the row
		if (props.isChild === true && props.isChildColumn === false) {
			return (React.createElement("td", {className: "owl-empty-child-cell"}));
		}

		if (typeof value === 'undefined' || value === '') {
			value = props.row[props.column.field.toUpperCase()];
			if (typeof value === 'undefined' || value === '') {
				value = props.row[props.column.field.toLowerCase()];

				if (typeof value === 'undefined' || value === '') {
					var elem;
					var tdClasses = props.column.field;
					var spanClasses = '';

					if (typeof props.column.tacky !== 'undefined' && props.column.tacky.left === true) {
						tdClasses = tdClasses + ' tacky-left';
					}

					if (props.editable === true) {
						spanClasses = 'owl-cell-value-label owl-editable';
					}

					if (!props.isChild && !props.isChildColumn) {
						elem = (React.createElement("td", {className: tdClasses}, React.createElement("span", {className: spanClasses}, "---")));
					} else {
						elem = (React.createElement("td", {className: "owl-empty-child-cell"}));
					}

					return elem;
				}
			}

		}

		if (props.column.type === 'checkbox' && !this.state.open) {
			value = self.decorateCheckboxValue(value);
		}

		if (props.column.type === 'radio') {
			value = self.textForRadioValue(value);
		}

		if (props.column.type.indexOf('select') > -1) {
			var split = [];
			var options;

			if (props.column.type === 'select_multiple') {
				split = _.compact(
					!props.row[props.column.field] ? props.row[props.column.field] : props.row[props.column.field].split('||')
				);
			}

			if (split.length > 1) {
				options =
					_(props.column.options)
					.filter(function (option) { if (_.contains(split, option.value)) { return true; } })
					.pluck('text').value().join(', ');
			} else {
				options = props.column.options.filter(function (option, index) {
					/* jshint ignore:start */
					// I want weak equality here.
					if (option.value == props.row[props.column.field]) {
						return true;
					}
					/* jshint ignore:end */
				});

				if (typeof options !== 'undefined' && options.length > 0) {
					options = options[0].text;
				} else {
					options = props.row[props.column.field];
					classes = classes + ' owl-invalid';
				}
			}

			if (typeof options !== 'undefined') {
				optionText = options;
			} else {
				optionText = props.row[props.column.field];
			}

			if (props.isChild) {
				classes = classes + ' owl-child-cell';
			}

			if (optionText === '' || typeof optionText === undefined || !optionText) {
				optionText = '---';
				classes = classes.replace(' owl-invalid', '');
			}

			content = React.createElement("span", {className: classes, dangerouslySetInnerHTML: {__html: optionText}});
		} else {
			if (props.isChild) {
				classes = classes + ' owl-child-cell';
			}

			if (value === '' || typeof value === undefined || !value) {
				value = '---';
			}

			content = React.createElement("span", {className: classes, dangerouslySetInnerHTML: { __html: value}});
		}

		if (this.state.open === true) {
			if (value === '---') {
				value = '';
			}

			content = React.createElement(OwlInput, {
						className: props.column.field, 
						column: props.column, 
						value: value, 
						row: props.row, 
						tableDidChange: props.tableDidChange, 
						closeCell: this.close}
					);
		}

		var cellLocked = _.indexOf(props.row.lockedCells, props.column.field) > -1;

		var tdClasses = props.column.field;
		if (typeof props.column.tacky !== 'undefined' && props.column.tacky.left === true) {
			tdClasses = tdClasses + ' tacky-left';
		}

		if (props.isChild) {
			tdClasses = tdClasses + ' owl-child-cell';
		}

		if (props.editable === true && cellLocked !== true) {
			// refactor the cell and input class into each other in the future
			td =
				React.createElement("td", {className: tdClasses, "data-field": props.column.field, onClick: this.open}, 
					content
				);
		} else {
			var innerHTML = props.column.type.indexOf('select') > -1 ? optionText : value;
			td =
				React.createElement("td", {className: tdClasses, "data-field": props.column.field}, 
					React.createElement("span", {className: "owl-cell-value-label owl-value", dangerouslySetInnerHTML: { __html: innerHTML}})
				);
		}

		return td;
	},
	decorateCheckboxValue: function (value) {
		switch (value) {
			case true:
			case 'true':
			case 'Y':
				return '<i class="owl-checked glyphicon glyphicon-ok"></i>';
			case false:
			case 'N':
			case 'false':
				return '<i class="owl-unchecked glyphicon glyphicon-remove"></i>';
			default:
				return value;
		}
	},
	textForRadioValue: function (value) {
		var returnValue = value;
		var indexedOptions = _.indexBy(this.props.column.options, 'value');

		if (!_.isUndefined(indexedOptions[value])) {
			returnValue = indexedOptions[value].text;
		}

		return returnValue;
	},
	componentDidUpdate: function () {
		var self = this;

		if (this.props.focusedCell !== false) {
			this.props.focusedCell.find('input').focus();
		}

		var swiftboxes = $(this.getDOMNode()).find('.swiftbox');

		if (swiftboxes.length > 0) {
			swiftboxes = swiftboxes.swiftbox();

			swiftboxes.each(function (index, box) {
				box = $(box);

				box.off('change');
				box.change(function (event) {
					var node = $(self.getDOMNode());
					var props = self.props;

					var val = box.swiftbox('value');

					if (props.column.type === 'select_multiple') {
						val = val.join('||');
					}

					event.target.value = val;

					props.tableDidChange(event, props.row, props.column);

					node.trigger('owlTableUpdated', [props.column, props.row, val]);
				});
			});
		}
	}
});

var OwlRow = React.createClass({
	displayName: 'OwlRow',
	propTypes: {
		data: React.PropTypes.object.isRequired,
		columns: React.PropTypes.array.isRequired,
		childColumns: React.PropTypes.array,
		open: React.PropTypes.bool.isRequired,
	},
	getDefaultProps: function () {
		return {
			className: ''
		};
	},
	getInitialState: function () {
		return {
			open: false,
			focusedCell: false
		};
	},
	componentWillReceiveProps: function (newProps) {
		this.setState({
			open: newProps.open
		});
	},
	clickHandler: function (event) {
		var cell = $(event.target);
		// need to focus the input that was clicked
		if (event.target.nodeName !== 'TD') {
			cell = cell.closest('td');
		}

		this.setState({
			open: true,
			focusedCell: cell
		});
	},
	render: function () {
		var props = this.props;
		var state = this.state;

		var handler = this.clickHandler;

		var cellCount = 0;

		var cells = props.columns.map(function (column, index) {
			var editable = true && column.editable;
			var ref = 'column_' + index;

			if (column.visible !== false) {
				return (
					React.createElement(OwlCell, {column: column, ref: ref, row: props.data, isChild: props.isChild, editable: editable, focusedCell: state.focusedCell, key: index, tableDidChange: props.tableDidChange})
				);
			}
		});

		cellCount = cells.length;

		if (props.childColumns.length > 0) {
			_.forEach(props.childColumns, function (column) {
				var editable = true && column.editable;
				var ref = 'column_' + cellCount;

				if (column.visible !== false) {

					//if we are rendering a childColumn but received the parent object, use the first child.
					//this is necessary because the first child is rendered on the parent row.
					if (typeof props.data.children === 'undefined') {
						rowData = props.data;
					} else {
						rowData = props.data.children[0];
					}
					cells.push(
						React.createElement(OwlCell, {column: column, ref: ref, row: rowData, isChildColumn: true, isChild: props.isChild, editable: editable, focusedCell: state.focusedCell, key: cellCount, tableDidChange: props.tableDidChange})
					);
				}

				cellCount++;
			});
		}

		var classes = (props.className + " owl-row trow").trim();

		return(
			React.createElement("tr", {className: classes, key: props.key}, 
				cells
			)
		);
	}
});

function stripFilters (string) {
	_.forOwn(filterOptions, function (val, key) {
		var keyRegExp = new RegExp('^' + key);
		string = string.replace(keyRegExp, '');
	});
	return string;
}

var filterOptions = {
	''          : 'Contains',
	'begin:'    : 'Begins with',
	'end:'      : 'Ends with',
	'empty'     : 'Empty',
	'not:empty' : 'Not empty'
};

var OwlTableReact = React.createClass({
	displayName: 'OwlTable',
	propTypes: {
		data: React.PropTypes.array.isRequired,
		columns: React.PropTypes.array.isRequired,
		childColumns: React.PropTypes.array,
		tacky: React.PropTypes.object,
		massUpdate: React.PropTypes.bool,
		pageChanged: React.PropTypes.bool,
		filteringEnabled: React.PropTypes.bool
	},
	tableDidChange: function (event, row, column) {
		if (typeof this.state.changedData[row.id] === 'undefined') {
			this.state.changedData[row.id] = {};
		}

		if (column.type.indexOf('select') === -1) {
			if (typeof event.target.value === 'function') {
				this.state.changedData[row.id][column.field] = event.target.value();
			} else {
				this.state.changedData[row.id][column.field] = event.target.value;
			}
		} else {
			this.state.changedData[row.id][column.field] = $(event.target).swiftbox('value');
		}
	},
	getDefaultProps: function () {
		return {
			tacky: {
				top: false,
				left: false
			},
			massUpdate: false,
			pageChanged: false,
			printMode: false,
			childColumns: []
		};
	},
	getInitialState: function () {
		return {
			changedData: {},
			openRows: {},
			sortReverse: false,
			sorted: false
		};
	},

	componentDidMount: function () {
		var self = this;

		var filterList = document.createElement('div');
		filterList.className = 'owl-filter-list';

		for(var i in filterOptions) {
			var option			= document.createElement('div');
			option.className	= 'owl-filter-type';
			option.innerHTML	= filterOptions[i];
			option.setAttribute('data-filter-type', i);

			filterList.appendChild(option);
		}

		$(document).on('click', function (event) {
			$('.tooltip').hide();
		});

		$(document).on('click', '.owl-change-filter-type', function (event) {
			filterList.currentInput = $(this).closest('.owl-filter').find('input');
			filterList.style.top = event.pageY+'px';
			filterList.style.left = event.pageX+'px';
			$(filterList).addClass('active');

			(document.body || document.documentElement).appendChild(filterList);
			event.stopPropagation();
		});

		$(document).on('click', '.owl-filter-type', function (event) {
			var filterType = $(this).data('filterType');
			var currentFilterText = stripFilters(filterList.currentInput.val());
			var condition;

			switch (filterType) {
				case 'begin:':
					condition = 2;
					break;
				case 'end:':
					condition = 4;
					break;
				case 'empty':
					condition = 8;
					break;
				case 'not:empty':
					condition = 32;
					break;
				default:
					condition = 16;
					break;
			}

			filterList.currentInput.data('conditionType', condition);
			filterList.currentInput.val(filterType + currentFilterText);
			filterList.currentInput.change();

			$(filterList).removeClass('active');
			filterList.currentInput.focus();

			if (condition === 8 || condition === 32) {
				var filter = {
					condition: condition,
					term: ''
				};

				var field = filterList.currentInput.closest('.owl-filter').data('field');

				self.props.filterDidChange(filter, field);
			}
			event.stopPropagation();
		});

		$(document).on('click', function (event) {
			$(filterList).removeClass('active');
		});
	},
	componentDidUpdate: function () {
		if (this.props.tacky) {
			$('.tacky').tacky();
		}
	},
	componentWillReceiveProps: function (newProps) {
		if (newProps.pageChanged === true) {
			this.setState({
				openRows: {}
			});
		}
	},
	sortClickHandler: function (field, event) {
		var state = this.state;
		var sortReverse = state.sortReverse;

		if (state.sorted === false) {
			this.setState({sorted: true}, function () {
				this.props.sortClickHandler(field, sortReverse);
			});
		} else {
			// flip the sort order
			sortReverse = !sortReverse;
			this.setState({sortReverse: sortReverse});
			this.props.sortClickHandler(field, sortReverse);
		}
	},
	filterFieldChanged: function (filter, event) {
		event.persist();
		var self = this;
		_.debounce(
			function (filter, event) {
				event.persist();
				filter.condition = $(event.target).data('conditionType');
				filter.term = stripFilters(event.target.value);
				self.props.filterDidChange(filter);
			}, 200
		)(filter, event);
	},
	keyup: function (event) {
		var td = $(event.target).parent();
		var handled = false;

		switch (event.which) {
			case 9:
				if (event.shiftKey !== true) {
					td.next().children().focus();
				} else {
					td.prev().children().focus();
				}
				handled = true;
				break;
			default:
				break;
		}

		if (handled === true) {
			event.stopPropagation();
		}
	},
	render: function () {
		var self = this;

		var props = self.props;
		var tackyTop = false;
		var tackyLeft = false;

		if (props.tacky) {
			if (props.tacky.top) {
				tackyTop = true;
			}

			if (props.tacky.left) {
				tackyLeft = props.tacky.left;
			}
		}

		var filterSection;
		var filters;

		if (props.filteringEnabled) {
			filters = props.columns.map(function (column, index) {
				if (typeof column.filters === 'undefined') {
					column.filters = [{
						predicate: '',
						type: 'contains'
					}];
				}
				// For each column, create a div with an input for each filter
				var colFilters = column.filters.map(function (filter, index) {
					if (column.type !== 'checkbox') {
						var buttonClass = index === 0 ? ' owl-filter-button-add' : ' owl-filter-button-remove';
						var onClick = index === 0 ? props.addFilter.bind(this, column) : props.removeFilter.bind(this, column, index);
						return (
							React.createElement("div", {"data-field": column.field, key: index, className: "owl-filter"}, 
								React.createElement("div", {onClick: onClick, className: 'owl-filter-button' + buttonClass}), 
								React.createElement("input", {type: "text", className: "owl-filter-input", onChange: self.filterFieldChanged.bind(null, filter), defaultValue: filter.predicate}), 
								React.createElement("div", {className: "owl-change-filter-type"})
							)
						);
					} else {
						return (
							React.createElement("label", {key: index, className: "owl-filter"}, 
								React.createElement("input", {type: "checkbox", className: "owl-filter-checkbox", onChange: self.filterFieldChanged.bind(null, filter), value: "Y"})
							)
						);
					}
				});

				var tackyLeft = '';
				if (isTackyLeft(column)) {
					tackyLeft = ' tacky-left';
				}

				return (
					React.createElement("th", {key: index, className: "tacky-top" + tackyLeft}, 
						React.createElement("div", {className: "owl-filter-wrapper"}, 
							colFilters
						)
					)
				);
			});

			filterSection = React.createElement("tr", {className: "owl-filter-row"}, " ", filters, " ");
		}

		function isTackyLeft (column) {
			return typeof column.tacky !== 'undefined' && column.tacky.left === true;
		}

		var headerCount = -1;

		var headers = props.columns.map(function (column, index) {
			var classes = 'owl-table-sortElement';
			var id = 'owl_header_' + column.field;
			if (tackyTop) {
				classes = classes + ' tacky-top';
			}

			if (isTackyLeft(column)) {
				classes = classes + ' tacky-left';
			}

			headerCount++;

			if (column.visible !== false) {
				return (
					React.createElement("th", {onClick: _.partial(self.sortClickHandler, column.field), className: classes, id: id, key: headerCount, "data-field": column.field}, 
						column.title || 'None'
					)
				);
			}
		});

		if (props.childColumns.length > 0) {
			_.forEach(props.childColumns, function (child, index) {
				var id = 'owl_child_header_' + child.field;
				var classes = '';

				if (tackyTop) {
					classes = 'tacky-top';
				}

				if (child.visible !== false) {
					headerCount++;
					headers.push(
						React.createElement("th", {className: classes, key: headerCount, id: id, "data-field": child.field}, 
							child.title || 'None'
						)
					);
				}
			});
		}

		var rowsWithChildren = [];
		var rowCount = 0;

		_.forEach(props.data, function (row, index) {
			var children = row.children;
			var hasChildren = !_.isUndefined(children) && _.isArray(children);

			// I have no idea why I added this code originally but its causing a bug where the parent
			// record gets modified...
			/*
				if (hasChildren) {
					for (var i in children[0]) {
						if (children[0].hasOwnProperty(i)) {
							console.log(i);
							row[i] = children[0][i];
						}
					}
				}
			*/

			rowsWithChildren.push(
				React.createElement(OwlRow, {
					data: row, 
					columns: props.columns, 
					childColumns: props.childColumns, 
					key: rowCount, 
					open: self.state.openRows[index] || false, 
					tableDidChange: self.tableDidChange}
				)
			);

			rowCount++;

			if (!_.isUndefined(children) && _.isArray(children)) {
				_.forEach(children, function (child, index) {
					if (index === 0) {
						return;
					}
					var classes = 'owl-child-row';
					if (index === 1) {
						classes = classes + ' owl-child-shadow';
					}
					rowsWithChildren.push(
						React.createElement(OwlRow, {data: child, className: classes, isChild: true, childColumns: props.childColumns, columns: props.columns, key: rowCount, open: self.state.openRows[index] || false, tableDidChange: self.tableDidChange})
					);
					rowCount++;
				});
			}
		});

		var classes = 'owl-table tacky';
		if (props.printMode !== false) {
			classes = classes + ' owl-table-print';
		}

		return (
			React.createElement("table", {onKeyUp: self.keyup, id: "owl-table", className: classes}, 
				React.createElement("thead", null, 
					filterSection, 
					React.createElement("tr", null, 
						headers
					)
				), 
				React.createElement("tbody", {className: "tbody"}, 
					rowsWithChildren
				)
			)
		);
	}
});

(function (angular) {
	'use strict';

	angular.module(
		'owlTable',
		[
			'ngAnimate',
			'ngSanitize',
			'ngCsv',
			'ui.bootstrap',
			'angular-ladda',
			'owlTablePartials'
		]
	);

})(window.angular);

(function (angular) {
	'use strict';

	angular.module('owlTable').constant('owlConstants', {
		defaults: {
			PER_PAGE: 25
		},
		exceptions: {
			noSaveRoute: {
				type: 'OwlException: noSaveRoute',
				error: 'No save route provided to table!'
			},
			noRow: {
				type: 'OwlException: noRow',
				error: 'Row does not exist'
			},
			badData: {
				type: 'OwlException: badData',
				error: 'Invalid data collection tried to be set on owlTable service'
			}
		},
		filtering: {
			STARTS_WITH: 2,
			ENDS_WITH: 4,
			EMPTY: 8,
			CONTAINS: 16,
			NOT_EMPTY: 32,
			defaults: {
				term: '',
				condition: 16,
				flags: {
					caseSensitive: false
				}
			}
		}
	});

})(window.angular);

(function (angular, _, $) {
'use strict';

function QuickCache() {
	var c = function(get, set) {
		// Return the cached value of 'get' if it's stored
		if (get && c.cache[get]) {
			return c.cache[get];
		} else if (get && set) {
			c.cache[get] = set;
			return c.cache[get];
		} else {
			return undefined;
		}
	};

	c.cache = {};

	c.clear = function () {
		c.cache = {};
	};

	return c;
}

function owlFilter (owlConstants, owlUtils) {
	return {

		hasNoFilters: function (columns) {
			return _.every(columns, function (column) {
				var ret = false;
				if (_.isEmpty(column.filters)) {
					ret = true;
				} else {
					ret = _.every(column.filters, function (filter) {
						return typeof filter.term === 'undefined' || filter.term === '' ;
					});
				}

				return ret;
			});
		},

		getTerm: function (filter) {
			if (typeof filter.term === 'undefined') {
				return filter.term;
			}

			var term = filter.term;

			if (typeof term === 'string') {
				term = term.trim();
			}

			return term;
		},

		stripTerm: function (filter) {
			var term = this.getTerm(filter);

			if (typeof term === 'string') {
				return owlUtils.escapeRegExp(term.replace(/(^\*|\*$)/g, ''));
			} else {
				return term;
			}
		},

		guessConditionRegex: function (filter) {
			if (typeof filter.term === 'undefined' || !filter.term) {
				return owlConstants.filtering.defaults.condition;
			}

			var term = this.getTerm(filter);

			if (/\*/.test(term)) {
				var regexpFlags = '';
				if (!filter.flags || !filter.flags.caseSensitive) {
					regexpFlags += 'i';
				}

				var reText = term.replace(/(\\)?\*/g, function ($0, $1) { return $1 ? $0 : '[\\s\\S]*?'; });
				return new RegExp('^' + reText + '$', regexpFlags);
			} else {
				return owlConstants.filtering.defaults.condition;
			}
		},

		filterCell: function (row, column, termCache, i, filter) {
			var conditionType = typeof filter.condition;
			if (conditionType === 'undefined' || !conditionType) {
				filter.condition = owlConstants.filtering.CONTAINS;
			}

			if (filter.condition === 8 || filter.condition === 32) {
				filter.term = 'foo';
			}

			var cacheId = column.field + i;

			var regexpFlags = 'i';

			var value = row[column.field];
			var term = this.stripTerm(filter);

			if (term === null || term === undefined || term === '') {
				return true;
			}

			if (filter.condition instanceof RegExp) {
				if (!filter.condition.test(value)) {
					return false;
				}
			} else if (conditionType === 'function') {
				return filter.condition(term, value, row, column);
			} else if (filter.condition === owlConstants.filtering.STARTS_WITH) {
				var startswithRE = termCache(cacheId) ? termCache(cacheId) : termCache(cacheId, new RegExp('^' + term, regexpFlags));

				if (!startswithRE.test(value)) {
					return false;
				}
			} else if (filter.condition === owlConstants.filtering.ENDS_WITH) {
				var endswithRE = termCache(cacheId) ? termCache(cacheId) : termCache(cacheId, new RegExp(term + '$', regexpFlags));

				if (!endswithRE.test(value)) {
					return false;
				}
			} else if (filter.condition === 8) {
				if (value.length !== 0) {
					return false;
				}
			} else if (filter.condition === owlConstants.filtering.CONTAINS) {
				var containsRE = termCache(cacheId) ? termCache(cacheId) : termCache(cacheId, new RegExp(term, regexpFlags));

				if (!containsRE.test(value)) {
					return false;
				}
			} else if (filter.condition === owlConstants.filtering.NOT_EMPTY) {
				if (value.length === 0) {
					return false;
				}
			}
			return true;
		},

		filterColumn: function (row, column, termCache) {
			var filters;

			if (typeof column.filters !== 'undefined' && column.filters && column.filters.length > 0) {
				filters = column.filters;
			} else {
				return true;
			}

			for (var i in filters) {
				if (filters.hasOwnProperty(i)) {
					var filter = filters[i];

					if (this.filterCell(row, column, termCache, i, filter) === true) {
						return true;
					}
				}
			}

			return false;
		},

		filterTable: function (rows, columns) {
			var self = this;

			if (!rows) {
				return;
			}

			var termCache = new QuickCache();

			var filterCols = [];
			var filteredRows = [];

			angular.forEach(columns, function (column) {
				if (typeof column.filters !== 'undefined' && column.filters.length > 0 && typeof column.filters[0].term !== 'undefined' && column.filters[0].term) {
					filterCols.push(column);
				} else if (typeof column.filters !== 'undefined' && column.filters && typeof column.filters[0].term !== 'undefined' && column.filters[0].term) {
					// Don't ask, cause I don't know.
					filterCols.push(column);
				} else if (typeof column.filters !== 'undefined' && (column.filters[0].condition === 8 || column.filters[0].condition === 32)) {
					filterCols.push(column);
				}
			});

			var rowShouldBeThere = false;

			if (filterCols.length > 0) {
				angular.forEach(rows, function forEachRow (row) {
					rowShouldBeThere = true;
					angular.forEach(filterCols, function forEachColumn (col) {
						if (self.filterColumn(row, col, termCache) === false) {
							rowShouldBeThere = false;
						}
					});

					if (rowShouldBeThere === true) {
						filteredRows.push(row);
					}
				});
			}

			termCache.clear();

			return filteredRows;
		}
	};
}

owlFilter.$inject = ['owlConstants', 'owlUtils'];

angular.module('owlTable')
	.service('owlFilter', owlFilter);

})(window.angular, window._, window.jQuery);

(function (angular, _) {
	'use strict';

	function owlResource ($http, owlUtils) {

		return function (options) {

			var saveUrl = '';

			if (typeof(options.saveUrl) !== 'undefined') {
				saveUrl = options.saveUrl;
			}

			var column = options.column;
			var value = options.value;
			var params = options.params;
			var data = {};

			var tableData = [{
				id: options.id
			}];

			tableData[0][column] = value;

			if (typeof params !== 'undefined') {
				data = _.clone(params);
			}

			data.data = tableData;

			return {
				id: options.id,
				column: options.column,
				value: options.value,
				saveUrl: saveUrl,
				save: function () {
					return $http({
						method: 'post',
						url: saveUrl,
						data: data
					});
				}
			};
		};
	}

	owlResource.$inject = ['$http', 'owlUtils'];

	angular.module('owlTable')
		.factory('owlResource', owlResource);

})(window.angular, window._);

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

(function (angular) {
	'use strict';

	function owlUtils (owlConstants) {

		function firstRowIfExists (array) {
			if (typeof array === 'undefined' || array.length === 0) {
				return false;
			} else {
				return array[0];
			}
		}

		function escapeRegExp (string) {
			return string.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
		}

		var utilService = {
			firstRowIfExists: firstRowIfExists,
			escapeRegExp: escapeRegExp
		};

		return utilService;
	}

	owlUtils.$inject = ['owlConstants'];

	angular.module('owlTable')
		.service('owlUtils', owlUtils);

})(window.angular);

(function (angular, _, $) {
	'use strict';
	/**
	*	owlTableDirective
	*	Master directive of owl-table
	*	Definition function
	*/
	function owlTableDirective ($timeout, $window, owlTable) {
		return {
			restrict: 'EA',
			scope: {
				data: '=',
				columns: '=',
				options: '=',
				childColumns: '='
			},
			templateUrl: 'partials/table.html',
			controllerAs: 'owlCtrl',
			compile: function (tElem, tAttrs) {

				return function link (scope, elem, attrs) {
					var table;
					var rendered;
					var container = elem.find('.owl-react-container')[0];

					var deepWatch = true;

					owlTable.registerTable(elem[0].id);

					scope.loading = true;
					scope.takingAWhile = false;
					scope.saved = false;
					scope.ajaxError = false;

					scope.printing = false;

					scope.owlCtrl.massUpdate = false;
					scope.massUpdateData = {};

					scope.lockedCells = owlTable.lockedCells;

					$timeout(function () {
						scope.takingAWhile = true;
					}, 5000);

					rendered = owlTable.initialize({
						data: scope.data,
						columns: scope.columns,
						options: scope.options,
						childColumns: scope.childColumns
					}).renderInto(container);

					scope.$watch('data', function (newValue) {
						if (newValue.length > 0) {
							owlTable.updateData(owlTable.sorted(newValue));

							scope.loading = false;
						}
					}, deepWatch);

					scope.$watchCollection('columns', function (newValue, oldValue) {
						if (newValue !== oldValue) {
							owlTable.updateColumns(newValue);
							scaleTableToColumns();
						}
					});

					scope.$watch('childColumns', function (newValue, oldValue) {
						owlTable.updateChildColumns(newValue);
						scaleTableToColumns();
					}, deepWatch);

					scope.$watch('options', function (newValue, oldValue) {
						owlTable.updateOptions(newValue, oldValue);
					}, deepWatch);

					scope.$watch('owlCtrl.massUpdate', function (newValue) {
						if (newValue === true) {
						//	console.log($('.owl-mass-update-header'));
							$('.owl-mass-update-header').each(function (index, header) {
							//	var columnHeader = $('.owl-table-sortElement[data-field="' + + '"]')
								header = $(header);
								var field = header.data('field');
								var columnHeader = $('.owl-table-sortElement[data-field="'+field+'"]');
							//	header.width(columnHeader.width());
							});

						}
						rendered.setProps({
							massUpdate: newValue
						});
					});

					scope.$on('owlTableAjaxError', function (event, message) {
						//scope.loading = false;
						scope.ajaxError = true;

						scope.ajaxErrorMessage = message[0];
					});

					// Yeah, totaly gotta get this out of here.
					scope.massUpdate = function () {
						scope.data = scope.data.map(function (datum, index) {
							if (index < (owlTable.page * owlTable.count - 1)) {
								angular.forEach(scope.massUpdateData, function (value, field) {
									datum[field] = value;
								});
							}
							return datum;
						});
					};

					angular.element($window)
						.on('beforeunload', function () {
							if (owlTable.isDirty()) {
								return 'You have unsaved changes.  They will be lost if you leave.';
							}
						})
						.on('resize', function () {
							scaleTableToColumns();
						});

					// Maybe this can stay since its an event handler.
					// But owlTable should be calling owlResource for sure.

					elem.on('owlTableUpdated', function (event, column, row, value) {
						if (scope.options.saveIndividualRows) {
							owlTable.saveRow(column, row, value).then(function (response) {
								scope.saved = true;
								$timeout(function () {
									scope.saved = false;
								}, 2000);
							});
						}

						owlTable.syncDataFromView(row, column, value);
					});

					var scaleTableToColumns = function () {
						var headers = $('owl-table').find('th');
						var tableWidth = headers.width() * headers.length;

						if (tableWidth > $('.owl-wrapper').width()) {
							$('.owl-table-wrapper').addClass('owl-stretch-after-load');
						}
					};

					scaleTableToColumns();
				};
			},
			controller: ['$scope', function ($scope) {
				var self = this;

				this.owlTable = owlTable;

				this.hasChangedData = owlTable.hasChangedData;

				this.nextPage = function () {
					owlTable.nextPage();
				};

				this.prevPage = function () {
					owlTable.prevPage();
				};

				this.savePage = function () {
					this.saving = true;

					owlTable.saveAllChanged();

					$timeout(function () {
						self.saving = false;
					}, 2000);
				};

				this.tableWillPrint = function () {
					owlTable.prepareForPrinting();
				};

				this.tableDidPrint = function () {
					owlTable.finishedPrinting();
				};
			}]
		};
	}

	owlTableDirective.$inject = ['$timeout', '$window', 'owlTable'];

	angular.module('owlTable')
		.directive('owlTable', owlTableDirective);

})(window.angular, window._, window.jQuery);

(function (angular) {
	'use strict';

	function owlCustomizeColumns (owlTable) {
		return {
			restrict: 'EA',
			require: '^owlTable',
			templateUrl: 'partials/customizeColumns.html'
		};
	}

	owlCustomizeColumns.$inject = ['owlTable'];
	
	angular.module('owlTable')
		.directive('owlCustomizeColumns', owlCustomizeColumns);

})(window.angular);

(function (angular, $) {
	'use strict';

	function owlExportControls (owlTable) {
		return {
			restrict: 'EA',
			require: '^owlTable',
			templateUrl: 'partials/export.html',
			controllerAs: 'exportCtrl',
			compile: function (tElem, tAttrs) {
				return function link (scope, elem, attrs) {};
			},
			controller: ['$scope', function ($scope) {
				this.csvHeader = function () {
					return $scope.columns.map(function (column) {
						return column.title;
					});
				};

				this.csvData = function () {
					var columns = $scope.columns;

					var data = _.cloneDeep($scope.data);

					return data.map(function (datum, index) {
						_.forOwn(datum, function (value, key) {
							var column = _.where(columns, {'field': key});
							column = _.first(column);
							if (typeof column !== 'undefined') {
								if (typeof column.options !== 'undefined') {
									var option = _.where(column.options, {'value': value});
									option = _.first(option) || {};
									if (typeof option.text !== 'undefined') {
										var div = document.createElement("div");
										div.innerHTML = option.text;
										datum[key] = div.textContent || div.innerText || "";
									}
								}
							} else {
								delete datum[key];
							}
						});

						return datum;
					});
				};
			}]
		};
	}

	owlExportControls.$inject = ['owlTable'];

	angular.module('owlTable')
		.directive('owlExportControls', owlExportControls);

})(window.angular, window.jQuery);

(function (angular) {
	'use strict';

	function owlFilterControls (owlTable) {
		return {
			restrict: 'EA',
			require: '^owlTable',
			templateUrl: 'partials/filter.html',
			compile: function (tElem, tAttrs) {
				return function link (scope, elem, attrs) {};
			}
		};
	}

	owlFilterControls.$inject = ['owlTable'];

	angular.module('owlTable')
		.directive('owlFilterControls', owlFilterControls);

})(window.angular);

(function (angular) {
	'use strict';

	function owlPagination (owlTable) {
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

	owlPagination.$inject = ['owlTable'];

	angular.module('owlTable')
		.directive('owlPagination', owlPagination);

})(window.angular);

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

(function (angular, _, $, Spinner) {
	'use strict';

	function owlSpinner(owlTable) {
		function link (scope, elem, attrs, tableCtrl) {
			var opts = {
				lines: 13, // The number of lines to draw
				length: 20, // The length of each line
				width: 10, // The line thickness
				radius: 30, // The radius of the inner circle
				corners: 1, // Corner roundness (0..1)
				rotate: 0, // The rotation offset
				direction: 1, // 1: clockwise, -1: counterclockwise
				color: '#000', // #rgb or #rrggbb or array of colors
				speed: 1, // Rounds per second
				trail: 60, // Afterglow percentage
				shadow: true, // Whether to render a shadow
				hwaccel: false, // Whether to use hardware acceleration
				className: 'spinner', // The CSS class to assign to the spinner
				zIndex: 2e9, // The z-index (defaults to 2000000000)
				top: '50%', // Top position relative to parent
				left: '50%' // Left position relative to parent
			};

			var target = angular.element('#owl-spin').get(0);

			var spinner = new Spinner(opts).spin(target);

			scope.$on('owlTableAjaxError', function (event, message) {
				spinner.stop();
			});
		}

		return {
			restrict: 'EA',
			require: '^owlTable',
			link: link,
			templateUrl: 'partials/ajaxLoader.html'
		};
	}
	angular.module('owlTable')
		.directive('owlSpinner', ['owlTable', owlSpinner]);

})(window.angular, window._, window.jQuery, window.Spinner);

(function(module) {
try {
  module = angular.module('owlTablePartials');
} catch (e) {
  module = angular.module('owlTablePartials', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/ajaxLoader.html',
    '<div ng-show="loading === true &amp;&amp; ajaxError !== true" class="owl-ajax-loading"><div class="owl-ajax-loading-interior"><div id="owl-spin"><p ng-show="takingAWhile !== true" class="owl-ajax-loading-label">Loading data...</p><p ng-show="takingAWhile === true">Sorry, things are taking a little longer than normal...</p></div></div></div><div ng-show="ajaxError === true" class="owl-ajax-loading owl-ajax-error"><div class="owl-ajax-loading-interior owl-ajax-error-interior"><p ng-show="ajaxError === true" class="owl-ajax-loading-label owl-ajax-error-label">{{ajaxErrorMessage}}</p></div></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('owlTablePartials');
} catch (e) {
  module = angular.module('owlTablePartials', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/columnModal.html',
    '<div class="modal-header"><h3 class="modal-title">Customize Columns</h3></div><div class="modal-body owl-modal-body"><ul class="row"><li ng-repeat="column in columns" class="col-md-4 col-sm-4 col-lg-4"><a ng-attr-id="{{\'customize_\' + column.field}}" ng-click="toggleColumn(column)" ng-class="{strikethrough: !column.visible}">{{ column.title }}</a></li></ul></div><div class="modal-footer"><button ng-click="ok()" class="btn btn-primary owl-column-modal-ok">Ok</button></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('owlTablePartials');
} catch (e) {
  module = angular.module('owlTablePartials', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/customizeColumns.html',
    '<span class="owl-customize-columns"><button ng-click="owlCtrl.owlTable.customizeColumns()" class="btn btn-xs btn-primary owl-customize-columns-button">Customize Columns</button></span>');
}]);
})();

(function(module) {
try {
  module = angular.module('owlTablePartials');
} catch (e) {
  module = angular.module('owlTablePartials', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/export.html',
    '<div class="owl-export-controls"><span class="owl-control-label">Export:</span><span class="owl-export-buttons"><span type="button" ng-csv="exportCtrl.csvData()" filename="focus.csv" csv-header="exportCtrl.csvHeader()" class="owl-export-button-csv"></span><span type="button" owl-print="owl-print" print-element-id="owl-table" class="owl-export-button-print"></span></span></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('owlTablePartials');
} catch (e) {
  module = angular.module('owlTablePartials', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/filter.html',
    '<div class="owl-filter-controls"><span class="owl-control-label">Filters:</span><span ng-click="owlCtrl.owlTable.toggleFiltering()" class="owl-filter-buttons"><span ng-if="owlCtrl.owlTable.filteringEnabled">ON</span><span ng-if="!owlCtrl.owlTable.filteringEnabled">OFF</span></span></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('owlTablePartials');
} catch (e) {
  module = angular.module('owlTablePartials', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/pagination.html',
    '<div class="owl-pagination-buttons active"><button ng-click="owlCtrl.prevPage()" class="owl-pagination-button owl-previous-page">&lt; Prev</button><div class="owl-page-count">Page <input type="text" size="3" ng-model="owlCtrl.owlTable.page">&nbsp;&nbsp;of {{owlCtrl.owlTable.pages}}</div><button ng-click="owlCtrl.nextPage()" class="owl-pagination-button owl-next-page">Next &gt;</button></div>');
}]);
})();

(function(module) {
try {
  module = angular.module('owlTablePartials');
} catch (e) {
  module = angular.module('owlTablePartials', []);
}
module.run(['$templateCache', function($templateCache) {
  $templateCache.put('partials/table.html',
    '<div class="container-fluid owl-wrapper"><div class="owl-top-controls"><owl-pagination></owl-pagination><owl-export-controls></owl-export-controls><owl-filter-controls></owl-filter-controls><owl-customize-columns ng-if="options.customizeColumns"></owl-customize-columns><span class="owl-top-control-right-buttons"><div ng-if="options.massUpdate === true" class="form-inline owl-top-control-right owl-top-control-mass-update"><div class="form-group"><div class="checkbox"><label><input id="massUpdateToggle" type="checkbox" value="true" ng-model="owlCtrl.massUpdate">Mass Update</label></div></div><div ng-if="owlCtrl.massUpdate" class="form-group"><button id="massUpdate" ng-click="massUpdate()" class="btn btn-sm btn-default">Run Mass Update</button></div></div><div ng-if="options.saveIndividualRows !== true" class="owl-top-control-right owl-top-control-save"><div ng-hide="saved !== true">Saved</div><button id="saveButton" ng-class="{\'btn-danger\': owlCtrl.owlTable.hasChangedData, \'btn-default\': !owlCtrl.owlTable.hasChangedData}" ng-click="owlCtrl.savePage()" ng-disabled="!owlCtrl.owlTable.hasChangedData" ladda="owlCtrl.saving" data-style="expand-left" data-spinner-color="#FFF000" class="btn btn-sm btn-default">Save</button></div></span></div><div ng-class="{\'owl-stretch\': loading}" class="owl-table-wrapper"><div ng-show="owlCtrl.massUpdate" class="owl-mass-update-row"><table><thead><tr><th data-field="{{column.field}}" ng-repeat="column in columns track by $index" class="owl-mass-update-header">{{column.title}}</th></tr></thead><tbody><tr><td ng-repeat="column in columns track by $index" class="owl-mass-update-cell"><input type="text" ng-model="massUpdateData[column.field]"></td></tr></tbody></table></div><div ng-hide="loading === true" class="owl-table-inner-wrapper table-responsive tacky"><div class="owl-react-container"></div></div><owl-spinner></owl-spinner></div><owl-pagination></owl-pagination></div>');
}]);
})();
