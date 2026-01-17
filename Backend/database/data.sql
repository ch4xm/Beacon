-- Insert starter accounts
INSERT INTO account (id, name, email, password) VALUES
(1, 'Molly Member', 'molly@books.com', 'mollymember'),
(2, 'Anna Admin', 'anna@books.com', 'annaadmin');

-- Insert sample pins
INSERT INTO pin (id, creatorID, latitude, longitude, message, image, color) VALUES
(1, 1, 37.3387, 121.8853, 'Welcome to Beacon!', 'https://images.unsplash.com/photo-1516192518150-0d8fee5425e3', '#FF6B6B'),
(2, 1, 37.5485, 121.9883, 'Check this out', 'https://images.unsplash.com/photo-1518791841217-8f162f1e1131', '#4ECDC4'),
(3, 2, 36.9905, 122.0584, 'Admin announcement', 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64', '#95E1D3'),
(4, 2, 37.0483, 122.0168, 'New feature coming', 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce', '#FFE66D');
