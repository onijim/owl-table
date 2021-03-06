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
					<OwlCell column={column} ref={ref} row={props.data} isChild={props.isChild} editable={editable} focusedCell={state.focusedCell} key={index} tableDidChange={props.tableDidChange} />
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
						<OwlCell column={column} ref={ref} row={rowData} isChildColumn={true} isChild={props.isChild} editable={editable} focusedCell={state.focusedCell} key={cellCount} tableDidChange={props.tableDidChange} />
					);
				}

				cellCount++;
			});
		}

		var classes = (props.className + " owl-row trow").trim();

		return(
			<tr className={classes} key={props.key}>
				{cells}
			</tr>
		);
	}
});
