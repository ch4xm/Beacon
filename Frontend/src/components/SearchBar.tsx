export default function SearchBar() {
	return (
		<div className="search-bar">
			<form onSubmit={handleSearchSubmit} className="search-form" autoComplete="off">
				<input
					type="text"
					className="search-input"
					placeholder="Search places..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
				/>
				<button type="submit" className="search-button" aria-label="Search" disabled={isSearching}>
					{isSearching ? "…" : "🔍"}
				</button>
			</form>

			{searchResults.length > 0 && (
				<ul className="search-results">
					{searchResults.map((feature) => (
						<li
							key={feature.id}
							className="search-result-item"
							onMouseDown={() => handleSelectResult(feature)}
						>
							<div className="result-primary">{feature.text}</div>
							{feature.place_name && (
								<div className="result-secondary">{feature.place_name}</div>
							)}
						</li>
					))}
				</ul>
			)}
		</div>
	)
}