const joinIfExist = (arr, separator) => {
	if (Array.isArray(arr)) {
		return arr.filter(Boolean).join(separator);
	}
	return '';
};

const getNResults = (results, start, n) => results.slice(start, start + n);

const runCallbackSafely = callback => {
	try {
		return callback();
	} catch (error) {
		return '';
	}
};

module.exports = {
	joinIfExist,
	getNResults,
	runCallbackSafely,
};