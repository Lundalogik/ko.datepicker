/* Fork of Datepicker from jQuery-UI to be more knockout friendly. */
/*!
 * Fork of jQuery UI Datepicker
 * http://jqueryui.com
 *
 * Copyright 2012 jQuery Foundation and other contributors
 * Released under the MIT license.
 * http://jquery.org/license
 *
 * http://api.jqueryui.com/datepicker/
 *
 * Depends:
 *	$, ko, moment
 */
(function( $, ko, moment, undefined ) {

/* Date picker manager.
   Use the singleton instance of this class, ko.datepicker, to interact with the date picker.
   Settings for (groups of) date pickers are maintained in an instance object,
   allowing multiple different settings on the same page. */

function Datepicker() {
	this.debug = false; // Change this to true to start debugging
	this.regional = []; // Available regional settings, indexed by language code
	this.regional[''] = { // Default regional settings
		closeText: 'Done', // Display text for close link
		prevText: 'Prev', // Display text for previous month link
		nextText: 'Next', // Display text for next month link
		currentText: 'Today', // Display text for current month link
		monthNames: ['January','February','March','April','May','June',
			'July','August','September','October','November','December'], // Names of months for drop-down and formatting
		monthNamesShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'], // For formatting
		dayNames: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], // For formatting
		dayNamesShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'], // For formatting
		dayNamesMin: ['Su','Mo','Tu','We','Th','Fr','Sa'], // Column headings for days starting at Sunday
		weekHeader: 'Wk', // Column header for week of the year
		dateFormat: 'DD-MM-YY', // See format options on parseDate
		firstDay: 0, // The first day of the week, Sun = 0, Mon = 1, ...
		isRTL: false, // True if right-to-left language, false if left-to-right
		showMonthAfterYear: false, // True if the year select precedes month, false for month then year
		yearSuffix: '' // Additional text to append to the year in the month headers
	};
	this._defaults = { // Global defaults for all the date picker instances
		buttonImage: '', // URL for trigger button image
		buttonImageOnly: false, // True if the image appears alone, false if it appears on a button
		navigationAsDateFormat: false, // True if date formatting applied to prev/today/next links
		changeMonth: false, // True if month can be selected directly, false if only prev/next
		changeYear: false, // True if year can be selected directly, false if only prev/next
		showOtherMonths: false, // True to show dates in other months, false to leave blank
		selectOtherMonths: false, // True to allow selection of dates in other months, false for unselectable
		showWeek: false, // True to show week of the year, false to not show it
			// takes a Date and returns the number of the week for it
		numberOfMonths: 1, // Number of months to show at a time
		stepMonths: 1, // Number of months to step back/forward
		stepBigMonths: 12, // Number of months to step back/forward for the big links
		constrainInput: true // The input is constrained by the current date format
	};
	$.extend(this._defaults, this.regional['']);
}

$.extend(Datepicker.prototype, {
	//Keep track of the maximum number of rows displayed (see #7043)
	maxRows: 4,

	/* Debug logging (if enabled). */
	log: function () {
		if (this.debug)
			console.log.apply('', arguments);
	},

   _getKeydownHandler: function(inst) {
       	/* Handle keystrokes. */
        var self = this;
        return function(data,event) {
		    var handled = true;

		    var isRTL = self._get(inst, 'isRTL');
		    if (inst.showing()) {
		        switch (event.keyCode) {
		        case 9:
		            inst.showing(false);
		            handled = false;
		            break;// hide on tab out
		        case 13://enter
                    inst.currentDate(inst.selectedDate());
		            inst.showing(false);
		            return false; // don't submit the form
		            break;// select the value on enter
		        case 27:
		            inst.showing(false);
		            break;// hide on escape
		        case 33:
		            ko.datepicker._adjustInstMonth(inst, (event.ctrlKey ?
		                -ko.datepicker._get(inst, 'stepBigMonths') :
		                -ko.datepicker._get(inst, 'stepMonths')));
		            break;// previous month/year on page up/+ ctrl
		        case 34:
		            ko.datepicker._adjustInstMonth(inst, (event.ctrlKey ?
		                ko.datepicker._get(inst, 'stepBigMonths') :
		                ko.datepicker._get(inst, 'stepMonths')));
		            break;// next month/year on page down/+ ctrl
		        case 35:
		            if (event.ctrlKey || event.metaKey) ko.datepicker._clearDate(event.target);
		            handled = event.ctrlKey || event.metaKey;
		            break;// clear on ctrl or command +end
		        case 36:
		            if (event.ctrlKey || event.metaKey) ko.datepicker._gotoToday(event.target);
		            handled = event.ctrlKey || event.metaKey;
		            break;// current on ctrl or command +home
		        case 37:
		            if (event.ctrlKey || event.metaKey) {
		                ko.datepicker._adjustInstDay(inst, (isRTL ? +1 : -1));
		            }
		            handled = event.ctrlKey || event.metaKey;
						    // -1 day on ctrl or command +left
		            if (event.originalEvent.altKey) {
		                ko.datepicker._adjustInstMonth(inst, (event.ctrlKey ?
		                    -ko.datepicker._get(inst, 'stepBigMonths') :
		                    -ko.datepicker._get(inst, 'stepMonths')));
		            }
						    // next month/year on alt +left on Mac
		            break;
		        case 38:
		            if (event.ctrlKey || event.metaKey) {
		                ko.datepicker._adjustInstDay(inst, -7);
		            }
		            handled = event.ctrlKey || event.metaKey;
		            break;// -1 week on ctrl or command +up
		        case 39:
		            if (event.ctrlKey || event.metaKey) {
		                ko.datepicker._adjustInstDay(inst, (isRTL ? -1 : +1));
		            }
		            handled = event.ctrlKey || event.metaKey;
						    // +1 day on ctrl or command +right
		            if (event.originalEvent.altKey) {
		                ko.datepicker._adjustInstMonth(inst, (event.ctrlKey ?
		                    ko.datepicker._get(inst, 'stepBigMonths') :
		                    ko.datepicker._get(inst, 'stepMonths')));
		            }
						    // next month/year on alt +right
		            break;
		        case 40:
		            if (event.ctrlKey || event.metaKey) {
		                ko.datepicker._adjustInstDay(inst, +7);
		            }
		            handled = event.ctrlKey || event.metaKey;
		            break;// +1 week on ctrl or command +down
		        default:
		            handled = false;
		        }
		    } else if (event.keyCode == 36 && event.ctrlKey) { // display the date picker on ctrl+home
		        inst.showing(true);
		    } else {
			    handled = false;
		    }
		    if (handled) {
                //console.log('preventDefault');
			    event.preventDefault();
			    event.stopPropagation();
		    }else {
                return true;
		    }
        };
   },

   _getKeypressHandler: function(inst) {	/* Filter entered characters - based on date format. */
        return function(data,event) {
		    if (ko.datepicker._get(inst, 'constrainInput')) {
			    var chars = ko.datepicker._possibleChars(ko.datepicker._get(inst, 'dateFormat'));
			    var chr = String.fromCharCode(event.charCode == undefined ? event.keyCode : event.charCode);
			    return (event.ctrlKey || event.metaKey || (chr < ' ' || !chars || chars.indexOf(chr) > -1));
		    }
            return false;
        };
   },

	parseDate: function (format, value) {
		return moment(value, format).toDate();
	},


	formatDate: function (format, date) {
        return moment(date).format(format);
	},

	/* Extract all possible characters from the date format. */
	_possibleChars: function (format) {
		var chars = '';
		var literal = false;
		// Check whether a format character is doubled
		var lookAhead = function(match) {
			var matches = (iFormat + 1 < format.length && format.charAt(iFormat + 1) == match);
			if (matches)
				iFormat++;
			return matches;
		};
		for (var iFormat = 0; iFormat < format.length; iFormat++)
			if (literal)
				if (format.charAt(iFormat) == "'" && !lookAhead("'"))
					literal = false;
				else
					chars += format.charAt(iFormat);
			else
				switch (format.charAt(iFormat)) {
					case 'D': case 'M': case 'Y': case '@':
						chars += '0123456789';
						break;
					case 'd':
						return null; // Accept anything
					case "'":
						if (lookAhead("'"))
							chars += "'";
						else
							literal = true;
						break;
					default:
						chars += format.charAt(iFormat);
				}
		return chars;
	},

	/* Get a setting value, defaulting if necessary. */
	_get: function(inst, name) {
		return inst.settings[name] !== undefined ?
			inst.settings[name] : this._defaults[name];
	},

    /* Override the default settings for all instances of the date picker.
	   @param  settings  object - the new settings to use as defaults (anonymous object)
	   @return the manager object */
	setDefaults: function(settings) {
		extendRemove(this._defaults, settings || {});
		return this;
	},

	/* Handle switch to/from daylight saving.
	   Hours may be non-zero on daylight saving cut-over:
	   > 12 when midnight changeover, but then cannot generate
	   midnight datetime, so jump to 1AM, otherwise reset.
	   @param  date  (Date) the date to check
	   @return  (Date) the corrected date */
	_daylightSavingAdjust: function(date) {
		if (!date) return null;
		date.setHours(date.getHours() > 12 ? date.getHours() + 2 : 0);
		return date;
	},

    _getInstDate: function(inst) {
        var year = inst.drawYear();
		var month = inst.drawMonth();
		var day = Math.min(inst.selectedDay(), this._getDaysInMonth(year, month));
		return new Date(year, month, day);
    },

	_adjustInstMonth: function(inst, num) {
		var date = this._daylightSavingAdjust(moment(this._getInstDate(inst)).add('months', num).toDate());

		inst.selectedDate(date);

		inst.drawMonth(date.getMonth());
		inst.drawYear(date.getFullYear());
	},
    _adjustInstDay: function(inst, num) {
		var date = this._daylightSavingAdjust(moment(this._getInstDate(inst)).add('days', num).toDate());

        inst.selectedDate(date);
		
		inst.drawMonth(date.getMonth());
		inst.drawYear(date.getFullYear());
	},


    _getSevenDays:function(inst) {
        var dayNames = this._get(inst, 'dayNames');
		var dayNamesShort = this._get(inst, 'dayNamesShort');
		var dayNamesMin = this._get(inst, 'dayNamesMin');
		var firstDay = parseInt(this._get(inst, 'firstDay'),10);
		firstDay = (isNaN(firstDay) ? 0 : firstDay);

        var sevendays = [];
		var hday,day;

        for (var dow = 0; dow < 7; dow++) { // days of the week
			day = (dow + firstDay) % 7;
			hday = {
				name:dayNames[day],
				minName:dayNamesMin[day], 
				end:(dow + firstDay + 6) % 7 >= 5
			};
			sevendays.push(hday);
		}
        return sevendays;
    },
	
    newModel:function(settings) {
        var initialDate = new Date();
		    initialDate = this._daylightSavingAdjust(
			    new Date(initialDate.getFullYear(), initialDate.getMonth(), initialDate.getDate())); // clear time

        var inst = {
            settings : extendRemove(this._defaults, settings || {}),
			selectedDay: ko.observable( initialDate.getDate()),
            selectedMonth: ko.observable( initialDate.getMonth()), 
            selectedYear: ko.observable( initialDate.getFullYear()), // current selection
			drawMonth: ko.observable( initialDate.getMonth()), 
            drawYear: ko.observable( initialDate.getFullYear()), // month being drawn
            input:ko.observable(null),
            showing:ko.observable(false)
        };
        var model = {
            currentDay:ko.observable( 0),
			currentMonth:ko.observable( 0),
			currentYear:ko.observable( 0),
            weekHeader:ko.computed(function() {
                return this._get(inst, 'weekHeader');
            },this,{deferEvaluation:true}),
            showWeek:ko.computed(function() {
                return this._get(inst, 'showWeek');
            },this,{deferEvaluation:true}),
            showOtherMonths:ko.computed(function() {
                return this._get(inst, 'showOtherMonths');
            },this,{deferEvaluation:true}),
            name:ko.computed(function() {
                var monthNames = this._get(inst, 'monthNames');
                return monthNames[inst.drawMonth()];
            },this,{deferEvaluation:true}),
            year:ko.computed(function() {
                return inst.drawYear();
            },this,{deferEvaluation:true}),
            value:ko.computed({
                read:function() {
                    return inst.input();
                }, write :function(value){
                    if (value != inst.input()) {
			            try {
				            var date = this.parseDate(this._get(inst, 'dateFormat'),value);
				            if (date) { // only if valid
                                inst.currentDate(date);
				            }
			            }
			            catch (err) {
				            ko.datepicker.log(err);
			            }
                        inst.input(value);
		            }
                },
                owner:this,deferEvaluation:true
            }),
            selectedDate:ko.computed({
                read:function () {
                    var selectedDate = this._daylightSavingAdjust((!inst.selectedDay() ? new Date(9999, 9, 9) :
			            new Date(inst.selectedYear(), inst.selectedMonth(), inst.selectedDay())));
                    return selectedDate;
                },write:function(value) {
                    inst.selectedMonth(value.getMonth());
                    inst.selectedYear(value.getFullYear());
                    inst.selectedDay(value.getDate());
                },owner:this,
                deferEvaluation:true
            }),
            currentDate:ko.computed({
                read:function () {
                    var currentDate = this._daylightSavingAdjust((!inst.currentDay() ? new Date(9999, 9, 9) :
			            new Date(inst.currentYear(), inst.currentMonth(), inst.currentDay())));
                    return currentDate;
                },write:function(value) {
                    inst.currentMonth(value.getMonth());
                    inst.currentYear(value.getFullYear());
                    inst.currentDay(value.getDate());
                    inst.input(this.formatDate(this._get(inst, 'dateFormat'),value));
                },owner:this,
                deferEvaluation:true
            }),
            weeks:ko.computed(function() {
                var today = new Date();

		        today = this._daylightSavingAdjust(
			        new Date(today.getFullYear(), today.getMonth(), today.getDate())); // clear time

		        var numMonths = this._getNumberOfMonths(inst);
		        var isMultiMonth = (numMonths[0] != 1 || numMonths[1] != 1);
		        var drawMonth = inst.drawMonth();
		        var drawYear = inst.drawYear();
		        var firstDay = parseInt(this._get(inst, 'firstDay'),10);
		            firstDay = (isNaN(firstDay) ? 0 : firstDay);
		        var selectOtherMonths = this._get(inst, 'selectOtherMonths');
                var daysInMonth = this._getDaysInMonth(drawYear, drawMonth);
		        var leadDays = (this._getFirstDayOfMonth(drawYear, drawMonth) - firstDay + 7) % 7;
		        var curRows = Math.ceil((leadDays + daysInMonth) / 7); // calculate the number of rows to generate
                var numRows = (isMultiMonth ? this.maxRows > curRows ? this.maxRows : curRows : curRows); //If multiple months, use the higher number of rows (see #7043)
		        this.maxRows = numRows;
                var week,day;

		        var printDate = this._daylightSavingAdjust(new Date(drawYear, drawMonth, 1 - leadDays));
                var weeks = [];
		        for (var dRow = 0; dRow < numRows; dRow++) { // create date picker rows
			        week = {days:[]};
                    week.name = moment(new Date(printDate.getTime())).week();
                    weeks.push(week);
			        for (var dow = 0; dow < 7; dow++) { // create date picker days
                        var otherMonth = (printDate.getMonth() != drawMonth);
                        day = {
                            weekEnd: (dow + firstDay + 6) % 7 >= 5,
                            time:printDate.getTime(),
                            otherMonth:otherMonth, 
                            unselectable :(otherMonth && !selectOtherMonths),
                            today:printDate.getTime() == today.getTime(),
                            date:printDate.getDate(),
                            year:drawYear,
                            month:drawMonth,
                            showSpaceOnly: otherMonth && !inst.showOtherMonths()
                        };
                        day.highlight = printDate.getTime() == today.getTime() ;
				        week.days.push(day);
                        printDate.setDate(printDate.getDate() + 1);
				        printDate = this._daylightSavingAdjust(printDate);
			        }
		        }
                return weeks;
            },this,{deferEvaluation:true}),
            prevText:ko.computed(function() {
                var navigationAsDateFormat = this._get(inst, 'navigationAsDateFormat');
		        var stepMonths = this._get(inst, 'stepMonths');
                var prevText = this._get(inst, 'prevText');
		            prevText = (!navigationAsDateFormat ? prevText : this.formatDate(prevText,
			        this._daylightSavingAdjust(new Date(inst.drawYear(), inst.drawMonth() - stepMonths, 1))));
                return prevText;
            },this),
            nextText:ko.computed(function() {
                var navigationAsDateFormat = this._get(inst, 'navigationAsDateFormat');
		        var stepMonths = this._get(inst, 'stepMonths');
		        var nextText = this._get(inst, 'nextText');
		        nextText = (!navigationAsDateFormat ? nextText : this.formatDate(nextText,
			        this._daylightSavingAdjust(new Date(inst.drawYear(), inst.drawMonth() + stepMonths, 1))));
                return nextText;
            },this),
            next: this._getNextHandler(inst),
            prev: this._getPrevHandler(inst),
            keydown: this._getKeydownHandler(inst),
            keypress: this._getKeypressHandler(inst),
            selectDay: this._getSelectDayHandler(inst),
            sevendays : this._getSevenDays(inst),
            focus: this._getFocusHandler(inst)
        };

        _.extend(inst, model);
        return inst;
    },

    _getFocusHandler:function(inst) {
        return function (data,event) {
            inst.showing(true);
            return true;
        };

    },
    _getSelectDayHandler:function(inst) {
        return function (day,event) {
            inst.currentDate(new Date(day.year, day.month, day.date));
            inst.showing(false);
        };
    },

    _getNextHandler:function(inst) {
        return function (data,event) {
            ko.datepicker._adjustInstMonth(inst, (event.ctrlKey ?
							ko.datepicker._get(inst, 'stepBigMonths') :
							ko.datepicker._get(inst, 'stepMonths')));
        };
    },
    _getPrevHandler:function(inst) {
        return function (data, event) {
            ko.datepicker._adjustInstMonth(inst, (event.ctrlKey ?
							-ko.datepicker._get(inst, 'stepBigMonths') :
							-ko.datepicker._get(inst, 'stepMonths')));
        };
    },

	/* Determine the number of months to show. */
	_getNumberOfMonths: function(inst) {
		var numMonths = this._get(inst, 'numberOfMonths');
		return (numMonths == null ? [1, 1] : (typeof numMonths == 'number' ? [1, numMonths] : numMonths));
	},

	/* Find the number of days in a given month. */
	_getDaysInMonth: function(year, month) {
        return moment([year,month]).daysInMonth();
	},

	/* Find the day of the week of the first of a month. */
	_getFirstDayOfMonth: function(year, month) {
		return new Date(year, month, 1).getDay();
	}

});

/* jQuery extend now ignores nulls! */
function extendRemove(target, props) {
	$.extend(target, props);
	for (var name in props)
		if (props[name] == null || props[name] == undefined)
			target[name] = props[name];
	return target;
};

ko.datepicker = new Datepicker();// singleton instance
ko.datepicker.uuid = new Date().getTime();
ko.datepicker.initialized = false;

})(jQuery, ko, moment);
