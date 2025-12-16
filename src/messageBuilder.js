const { joinIfExist, getNResults, runCallbackSafely } = require('./utils');

const pageSize = 5;

const buildMessageFromTitle = title => {
	const titleData = title?.aboveTheFoldData;
	if (!titleData) {
		console.warn('No title data');
		return;
	}
	const titleName = titleData.titleText?.text;
	const titleType = titleData.titleType?.text;
	const yearRange = titleData.releaseYear;
	let yearText = yearRange?.year;
	if (yearText && titleType === 'TV Series') {
		yearText += `-${yearRange.endYear || ''}`;
	}
	const duration = titleData.runtime?.displayableProperty?.value?.plainText;
	const genres = titleData.genres?.genres?.map(g => g.text);

	const plot = runCallbackSafely(() => `\n${titleData.plot.plotText.plainText}`);
	let stars = runCallbackSafely(() => {
		let starsArr = titleData.principalCredits.find(c => c.category.text === 'Stars');
		starsArr = starsArr[0].credits.map(c => c.name.nameText.text);
		return joinIfExist(stars, ', ') + '.\n';
	});

	const rating = runCallbackSafely(() => '⭐️ ' + titleData.ratingsSummary.aggregateRating);
	const voteCount = titleData.ratingsSummary?.voteCount?.toLocaleString();
	const ranking = titleData.meterRanking;
	let rankingText;
	if (ranking) {
		const currentRank = ranking.currentRank;
		const rankDif = ranking.rankChange.difference;
		switch (ranking.rankChange.changeDirection) {
			case 'UP':
				rankingText = `🟢 ${currentRank} ↗️ ${rankDif}`;
				break;
			case 'DOWN':
				rankingText = `🔴 ${currentRank} ↘️ ${rankDif}`;
				break;
			case 'FLAT':
				rankingText = `⚪️ ${currentRank}`;
				break;
		}
	}
	const imdbUrl = `https://www.imdb.com/title/${titleData.id}`;
	const messageLines = [
		titleName,
		joinIfExist([titleType, yearText, duration], ' • '),
		joinIfExist(genres, ', '),
		plot,
		stars,
		' ', // empty line (creates new line after joinIfExist)
		joinIfExist([rating, voteCount, rankingText], ' • '),
		imdbUrl,
	];

	return joinIfExist(messageLines, '\n');
};

const buildInlineKeyboardFromResults = paginatedTitles => {
	const inlineKeyboard = paginatedTitles.map(title => {
		const titleTextInfo = [
			title.titleNameText,
			title.titleReleaseText,
			title.titleTypeText,
			joinIfExist(title.topCredits, ', '),
		];
		return [
			{
				text: joinIfExist(titleTextInfo, ' • '),
				callback_data: title.id,
			},
		];
	});
	return inlineKeyboard;
};

const buildPaginatedInlineKeyboard = (searchResults, searchTerm, startIdx) => {
	const paginatedTitles = getNResults(searchResults, startIdx, pageSize);
	const isFirstPage = startIdx <= 0; // should be === but <= for edge cases
	const isLastPage = searchResults.length - pageSize <= startIdx;
	if (isFirstPage) {
		startIdx = 0;
	}
	const inlineKeyboard = buildInlineKeyboardFromResults(paginatedTitles);

	const paginationButtons = [];
	if (!isFirstPage) {
		paginationButtons.push({
			text: '⬅️ Previous page',
			callback_data: `searchTerm=${searchTerm}__startIdx=${startIdx - pageSize}`,
		});
	}
	if (!isLastPage) {
		paginationButtons.push({
			text: 'Next page ➡️',
			callback_data: `searchTerm=${searchTerm}__startIdx=${startIdx + pageSize}`,
		});
	}
	inlineKeyboard.push(paginationButtons);

	return inlineKeyboard;
};

module.exports = {
	buildMessageFromTitle,
	buildPaginatedInlineKeyboard,
};
