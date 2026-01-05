INSERT INTO public.users(
        username,
        email,
        password_hash,
        role
	) VALUES (
        'admin',
        'admin@mediatracker.local',
        '$2a$10$7skIi/iCBN7xTpbDQQYUPu4pMOjRVlfQ4vLU3bfHIAReEkfTAlf1q', --123456
        'ADMIN');