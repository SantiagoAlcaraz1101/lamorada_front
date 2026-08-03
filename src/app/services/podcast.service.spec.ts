import { provideHttpClient } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { TestBed } from '@angular/core/testing';

import { PodcastService } from './podcast.service';

describe('PodcastService', () => {
  let service: PodcastService;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideRouter([])] });
    service = TestBed.inject(PodcastService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
